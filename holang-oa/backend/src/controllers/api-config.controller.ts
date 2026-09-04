import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as apiConfigService from '../services/api-config.service';
import * as apiTestService from '../services/api-test.service';
import { ApiProvider } from '../services/api-config.service';

/**
 * 获取全部 API 配置（包含凭证，仅管理员在 HTTPS 内网访问）
 */
export const getConfigs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const configs = apiConfigService.loadConfigs();
    res.json({ code: 0, message: '获取成功', data: configs });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: '获取配置失败: ' + error.message, data: null });
  }
};

/**
 * 更新某个服务商配置（覆盖 baseUrl/timeout/testEndpoint/credentials）
 */
export const updateConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    if (!isProvider(provider)) {
      res.status(400).json({ code: 400, message: '未知 provider', data: null });
      return;
    }

    const patch: Partial<apiConfigService.ApiConfig> = {};
    if (req.body.baseUrl !== undefined) patch.baseUrl = String(req.body.baseUrl);
    if (req.body.timeout !== undefined) patch.timeout = Number(req.body.timeout);
    if (req.body.testEndpoint !== undefined) patch.testEndpoint = String(req.body.testEndpoint);
    if (req.body.retryCount !== undefined) patch.retryCount = Number(req.body.retryCount);
    if (req.body.credentials !== undefined && typeof req.body.credentials === 'object') {
      patch.credentials = req.body.credentials as Record<string, string>;
    }

    const updated = apiConfigService.updateConfig(provider, patch);
    res.json({ code: 0, message: '保存成功', data: updated });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: '保存配置失败: ' + error.message, data: null });
  }
};

/**
 * 测试某个服务商连通性
 */
export const testConnection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    if (!isProvider(provider)) {
      res.status(400).json({ code: 400, message: '未知 provider', data: null });
      return;
    }

    const config = apiConfigService.getConfig(provider);
    if (!config) {
      res.status(404).json({ code: 404, message: '配置不存在', data: null });
      return;
    }

    // 测试时允许前端传入临时凭证；未传则使用服务端已保存的凭证
    const testConfig: apiConfigService.ApiConfig = {
      ...config,
      credentials:
        req.body && typeof req.body.credentials === 'object'
          ? (req.body.credentials as Record<string, string>)
          : config.credentials,
    };

    apiConfigService.updateConfig(provider, { status: 'testing' });
    const result = await apiTestService.testProvider(provider, testConfig);

    const now = new Date().toISOString();
    const status: apiConfigService.ConnectionStatus = result.ok ? 'connected' : 'failed';
    apiConfigService.updateConfig(provider, { status, testedAt: now });

    if (result.ok) {
      res.json({ code: 0, message: result.message, data: result.detail || null });
    } else {
      res.status(502).json({ code: -1, message: result.message, data: result.detail || null });
    }
  } catch (error: any) {
    res.status(502).json({ code: -1, message: '测试连接失败: ' + error.message, data: null });
  }
};

function isProvider(value: string): value is ApiProvider {
  return ['feishu', 'wecom', 'deepseek', 'ima', 'tencent_docs', 'whatsapp_360dialog'].includes(value);
}
