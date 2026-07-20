import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Product, productCategories } from '../data/mockData'
import api from '../services/api'

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<Omit<Product, 'id' | 'createdAt'>>({
    name: '',
    nameEn: '',
    code: '',
    brand: 'HOLANG',
    model: '',
    category: '氮气N',
    unit: '台',
    costPrice: 0,
    salePrice: 0,
    taxRate: 13,
    status: 'active',
    description: '',
    descriptionEn: '',
    length: 0,
    width: 0,
    image: '',
    sellStatus: 'selling',
    standardPrice: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isEdit && id) {
      api.get('/products/' + id).then((res: any) => {
        if (res.code === 0 && res.data) {
          const { id: _id, createdAt: _c, ...rest } = res.data
          setForm(rest)
        }
      }).catch(() => {})
    }
  }, [id, isEdit])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '请输入产品名称'
    if (!form.model.trim()) errs.model = '请输入规格型号'
    if (form.costPrice <= 0) errs.costPrice = '请输入有效的成本价'
    if (form.salePrice <= 0) errs.salePrice = '请输入有效的售价'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload: any = {
        name: form.name,
        nameEn: form.nameEn,
        code: form.code,
        brand: form.brand,
        model: form.model,
        category: form.category,
        unit: form.unit,
        costPrice: form.costPrice,
        salePrice: form.salePrice,
        taxRate: form.taxRate,
        status: form.status,
        description: form.description,
        descriptionEn: form.descriptionEn,
        sellStatus: form.sellStatus,
        standardPrice: form.standardPrice,
      }
      if (isEdit && id) {
        await api.put('/products/' + id, payload)
      } else {
        await api.post('/products', payload)
      }
      navigate('/products')
    } catch (err: any) {
      alert('保存失败: ' + (err?.message || '未知错误'))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/products')} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? '编辑产品' : '新增产品'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b">基本信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">产品名称 <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="如：模块式氮气发生器" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品编码</label>
              <input type="text" value={form.code} onChange={(e) => set('code', e.target.value)} className="input-field" placeholder="P001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">规格型号 <span className="text-red-500">*</span></label>
              <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)} className={`input-field ${errors.model ? 'border-red-400' : ''}`} placeholder="NPL02B" />
              {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品分类</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-field">
                {productCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input type="text" value={form.unit} onChange={(e) => set('unit', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input-field">
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b">价格信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成本单价（元）<span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set('costPrice', parseFloat(e.target.value) || 0)} className={`input-field ${errors.costPrice ? 'border-red-400' : ''}`} />
              {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">销售价（含税/元）<span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => set('salePrice', parseFloat(e.target.value) || 0)} className={`input-field ${errors.salePrice ? 'border-red-400' : ''}`} />
              {errors.salePrice && <p className="text-red-500 text-xs mt-1">{errors.salePrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">增值税率%</label>
              <input type="number" min="0" max="100" value={form.taxRate} onChange={(e) => set('taxRate', parseFloat(e.target.value) || 0)} className="input-field" />
            </div>
          </div>

          {/* Calculated fields */}
          {form.costPrice > 0 && form.salePrice > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <div><span className="text-gray-500">不含税单价：</span><span className="font-medium">¥{(form.salePrice / (1 + form.taxRate / 100)).toFixed(2)}</span></div>
              <div><span className="text-gray-500">税额：</span><span className="font-medium">¥{(form.salePrice - form.salePrice / (1 + form.taxRate / 100)).toFixed(2)}</span></div>
              <div><span className="text-gray-500">毛利：</span><span className="font-medium text-green-600">¥{(form.salePrice - form.costPrice).toFixed(2)}</span></div>
              <div><span className="text-gray-500">毛利率：</span><span className="font-medium text-green-600">{(((form.salePrice - form.costPrice) / form.salePrice) * 100).toFixed(1)}%</span></div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-3 border-b">备注</h3>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="input-field" placeholder="产品描述、技术参数等" />
        </div>

        <div className="flex gap-3 pt-3">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <Save size={16} /> {isEdit ? '保存修改' : '创建产品'}
          </button>
          <button type="button" onClick={() => navigate('/products')} className="btn-secondary">取消</button>
        </div>
      </form>
    </div>
  )
}
