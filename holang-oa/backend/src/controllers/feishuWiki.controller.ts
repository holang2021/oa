import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as feishuWikiService from '../services/feishuWiki.service';

// 连通性校验（ADMIN）
export const verify = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = feishuWikiService.getSettings();
    if (!settings.wikiSpaceId) {
      return res.status(400).json({ code: 400, message: '未配置飞书空间 ID', data: null });
    }
    const result = await feishuWikiService.verifySpace(settings.wikiSpaceId);
    if (result.ok) {
      res.json({ code: 0, message: '连通正常', data: result });
    } else {
      res.status(502).json({ code: -1, message: result.message, data: result });
    }
  } catch (error: any) {
    res.status(502).json({ code: -1, message: '校验失败: ' + error.message, data: null });
  }
};

// 读设置（ADMIN）
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ code: 0, message: '获取成功', data: feishuWikiService.getSettings() });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
};

// 改设置（ADMIN）
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patch: any = {};
    const allowed = ['enabled', 'syncFollowUp', 'syncAiThread', 'syncContactNote', 'wikiSpaceId', 'aiIdleMinutes'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const updated = feishuWikiService.saveSettings(patch);
    res.json({ code: 0, message: '保存成功', data: updated });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
};

// 检索同步记录（登录用户）
export const getRecords = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword = '', customerId = '', type = '', from = '', to = '', page = '1', pageSize = '20' } = req.query as any;
    const result = await feishuWikiService.searchLogs({
      keyword,
      customerId,
      type,
      from,
      to,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    res.json({ code: 0, message: '获取成功', data: result });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
};

// 拉取正文（登录用户）
export const getRecordContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await feishuWikiService.fetchLogContent(id);
    res.json({ code: 0, message: '获取成功', data: result });
  } catch (error: any) {
    res.status(404).json({ code: 404, message: error.message, data: null });
  }
};

// 单条重推（ADMIN）
export const resync = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { oaRecordId } = req.params;
    await feishuWikiService.resyncFollowUp(oaRecordId);
    res.json({ code: 0, message: '重推成功', data: null });
  } catch (error: any) {
    res.status(502).json({ code: -1, message: error.message, data: null });
  }
};

// 批量推送（ADMIN）
export const batchSync = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'ids 不能为空', data: null });
    }
    const result = await feishuWikiService.batchSyncFollowUps(ids);
    res.json({ code: 0, message: `成功 ${result.success}，失败 ${result.failed}`, data: result });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
};
