// ============================================================
// Quotation Form Page - Create & Edit
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MOCK_QUOTATIONS, generateQuoteNo, PRODUCT_MODELS } from "@/data/mockData";
import type { Quotation, QuotationItem } from "@/types";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";

const EMPTY_ITEM: QuotationItem = {
  id: "", itemNo: 1, productName: "氮气发生器", model: "",
  nitrogenFlow: "", nitrogenPurity: "", oxygenContent: "",
  inletSize: "", outletSize: "", power: "", dimensions: "",
  airRequirement: "", inletPressure: "≥0.7MPa",
  quantity: 1, unitPrice: 0, totalPrice: 0,
};

const EMPTY_QUOTATION: Omit<Quotation, "id"> = {
  quoteNo: "", quoteDate: new Date().toISOString().slice(0, 10), validDays: 30,
  customerName: "", customerContact: "", customerEmail: "", customerPhone: "",
  subject: "氮气发生器 报价", ourCompany: "昊朗（苏州）能源科技有限公司",
  ourContact: "刘世光 18662335855", ourEmail: "henry.liu@holangchina.com",
  ourPhone: "400-0512-711", items: [{ ...EMPTY_ITEM, id: Date.now().toString() }],
  subtotal: 0, status: "draft" as const,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: "current",
};

export function QuotationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_QUOTATION);
  const [saved, setSaved] = useState(false);

  // Load existing quotation for edit
  useEffect(() => {
    if (isEdit) {
      const existing = MOCK_QUOTATIONS.find(q => q.id === id);
      if (existing) {
        const { id: _, ...rest } = existing;
        setForm(rest);
      }
    } else {
      setForm(prev => ({
        ...prev,
        quoteNo: generateQuoteNo(MOCK_QUOTATIONS),
      }));
    }
  }, [id, isEdit]);

  const updateField = (field: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (idx: number, field: keyof QuotationItem, value: string | number) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      // Auto-calc total
      if (field === "unitPrice" || field === "quantity") {
        items[idx].totalPrice = items[idx].unitPrice * items[idx].quantity;
      }
      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
      return { ...prev, items, subtotal };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM, id: Date.now().toString(), itemNo: prev.items.length + 1 }],
    }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, itemNo: i + 1 })),
      subtotal: prev.items.filter((_, i) => i !== idx).reduce((s, i) => s + i.totalPrice, 0),
    }));
  };

  const handleSave = () => {
    // In real app: POST/PUT to API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/quotations")}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? "编辑报价" : "新建报价"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            报价编号：{form.quoteNo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium
              text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            保存草稿
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
              hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            生成报价单
          </button>
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          报价单已保存成功
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">客户信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">客户名称 *</label>
                <input
                  type="text" value={form.customerName}
                  onChange={e => updateField("customerName", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="公司全称"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">联系人</label>
                <input
                  type="text" value={form.customerContact}
                  onChange={e => updateField("customerContact", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="姓名 职位"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">客户邮箱</label>
                <input
                  type="email" value={form.customerEmail || ""}
                  onChange={e => updateField("customerEmail", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">客户电话</label>
                <input
                  type="text" value={form.customerPhone || ""}
                  onChange={e => updateField("customerPhone", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">报价主题</label>
                <input
                  type="text" value={form.subject}
                  onChange={e => updateField("subject", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quote items */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">报价明细</h3>
              <button
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加产品
              </button>
            </div>

            <div className="space-y-6">
              {form.items.map((item, idx) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">项目 {item.itemNo}</span>
                    {form.items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">产品名称</label>
                      <input type="text" value={item.productName}
                        onChange={e => updateItem(idx, "productName", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">型号</label>
                      <input type="text" value={item.model} list="models"
                        onChange={e => updateItem(idx, "model", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        placeholder="如 NPL02B"
                      />
                      <datalist id="models">
                        {PRODUCT_MODELS.map(m => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">氮气流量</label>
                      <input type="text" value={item.nitrogenFlow}
                        onChange={e => updateItem(idx, "nitrogenFlow", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        placeholder="如 4.4m³/h"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">氮气纯度</label>
                      <input type="text" value={item.nitrogenPurity}
                        onChange={e => updateItem(idx, "nitrogenPurity", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">氧含量</label>
                      <input type="text" value={item.oxygenContent}
                        onChange={e => updateItem(idx, "oxygenContent", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        placeholder="如 ≤10ppm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">功率</label>
                      <input type="text" value={item.power}
                        onChange={e => updateItem(idx, "power", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">外形尺寸</label>
                      <input type="text" value={item.dimensions}
                        onChange={e => updateItem(idx, "dimensions", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">进气口/出气口</label>
                      <div className="flex gap-2">
                        <input type="text" value={item.inletSize}
                          onChange={e => updateItem(idx, "inletSize", e.target.value)}
                          className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                          placeholder="进气口"
                        />
                        <input type="text" value={item.outletSize}
                          onChange={e => updateItem(idx, "outletSize", e.target.value)}
                          className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                          placeholder="出气口"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">用气需求/进气压力</label>
                      <div className="flex gap-2">
                        <input type="text" value={item.airRequirement}
                          onChange={e => updateItem(idx, "airRequirement", e.target.value)}
                          className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                          placeholder="用气需求"
                        />
                        <input type="text" value={item.inletPressure}
                          onChange={e => updateItem(idx, "inletPressure", e.target.value)}
                          className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                          placeholder="进气压力"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">数量</label>
                      <input type="number" min={1} value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">单价 (RMB)</label>
                      <input type="number" min={0} value={item.unitPrice}
                        onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">总价 (RMB)</label>
                      <input type="number" value={item.totalPrice} readOnly
                        className="w-full px-3 py-2 rounded border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">备注</label>
                      <input type="text" value={item.notes || ""}
                        onChange={e => updateItem(idx, "notes", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                        placeholder="用途说明等"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-slate-500">报价合计</p>
                <p className="text-2xl font-bold text-blue-600">¥{form.subtotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quote settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">报价设置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">报价日期</label>
                <input type="date" value={form.quoteDate}
                  onChange={e => updateField("quoteDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">有效期(天)</label>
                <input type="number" min={1} value={form.validDays}
                  onChange={e => updateField("validDays", parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">我司信息</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">公司名称</label>
                <input type="text" value={form.ourCompany}
                  onChange={e => updateField("ourCompany", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">联系人</label>
                <input type="text" value={form.ourContact}
                  onChange={e => updateField("ourContact", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">邮箱</label>
                <input type="email" value={form.ourEmail}
                  onChange={e => updateField("ourEmail", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">电话</label>
                <input type="text" value={form.ourPhone}
                  onChange={e => updateField("ourPhone", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
