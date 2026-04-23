"use client"

import React, { useState, useEffect } from 'react'
import styles from './page.module.css'

export default function NasaControlCenter() {
  const [searchCode, setSearchCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    code: '',
    type: 'BUSINESS',
    status: 'ACTIVE',
    devBatch: '',
    toUser: "Don't panic",
    toEngineer: 'Houston, we have a problem.',
    cause: '42',
    detailPage: '',
    comments: ''
  })

  // 页面加载时自动读取 URL 中的 ?code=xxx 参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchCode = params.get('code')
    if (searchCode) {
      setSearchCode(searchCode)
      handleSearch(searchCode)
    }
  }, [])

  const handleSearch = async (codeToSearch: string = searchCode) => {
    if (!codeToSearch) return
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/problem?code=${encodeURIComponent(codeToSearch)}`)
      const json = await res.json()

      if (json.found && json.data) {
        setIsEditing(true)
        setFormData({
          code: json.data.code,
          type: json.data.type || 'BUSINESS',
          status: json.data.status || 'ACTIVE',
          devBatch: json.data.devBatch || '',
          toUser: json.data.toUser || "Don't panic",
          toEngineer: json.data.toEngineer || "Houston, we have a problem.",
          cause: json.data.cause || "42",
          detailPage: json.data.detailPage || '',
          comments: json.data.comments || ''
        })
        setMessage('配置已找到，当前处于编辑模式。')
      } else {
        setIsEditing(false)
        setFormData(prev => ({ ...prev, code: codeToSearch }))
        setMessage('这是一个全新的错误码，将为您创建新条目。')
      }
    } catch (e) {
      setMessage('查询接口异常，请检查网络。')
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      if (json.success) {
        setIsEditing(true)
        setMessage('成功同步至指挥中心！')
        // 同步修改URL状态
        window.history.replaceState({}, '', `/nasa?code=${formData.code}`)
      } else {
        setMessage(`保存失败: ${json.error}`)
      }
    } catch (e) {
      setMessage('网络异常，保存失败。')
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className={styles.container}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>错误码管理系统-编辑</h1>
          <div className={styles.subtitle}>MARTIAN EXCEPTION GUIDANCE SYSTEM：EDIT</div>
        </div>

        <div className={styles.panel}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="输入错误码 (如 ORDER_TIMEOUT_001) 开始检索或创建..."
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className={styles.btn} onClick={() => handleSearch()} disabled={loading}>
              {loading ? '检索中...' : 'SCAN'}
            </button>
          </div>

          {message && (
            <div style={{ marginBottom: '20px', color: '#00e5ff' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className={`${styles.formGrid} ${loading ? styles.loading : ''}`}>
            <div className={styles.fullWidth}>
              <span className={`${styles.badge} ${isEditing ? styles.badgeEdit : styles.badgeNew}`}>
                {isEditing ? 'EDIT MODE' : 'CREATE MODE'}
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Error Code / 核心异常码 *</label>
              <input required name="code" value={formData.code} onChange={handleChange} className={styles.input} readOnly={isEditing} style={{ opacity: isEditing ? 0.6 : 1 }} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Dev Batch / 研发需求批次 *</label>
              <input required name="devBatch" value={formData.devBatch} onChange={handleChange} className={styles.input} placeholder="例: 【PRD-2026】支付重构" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Type / 拦截类型</label>
              <select name="type" value={formData.type} onChange={handleChange} className={styles.select}>
                <option value="BUSINESS">BUSINESS (业务规则阻断)</option>
                <option value="SYSTEM">SYSTEM (系统级物理崩溃)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Status / 启用状态</label>
              <select name="status" value={formData.status} onChange={handleChange} className={styles.select}>
                <option value="ACTIVE">ACTIVE (拦截生效中)</option>
                <option value="INACTIVE">INACTIVE (废弃/停用)</option>
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>To User / 用户视角提示 </label>
              <input name="toUser" value={formData.toUser} onChange={handleChange} className={styles.input} />
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>To Engineer / 工程师视角</label>
              <input name="toEngineer" value={formData.toEngineer} onChange={handleChange} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Cause / 根因</label>
              <input name="cause" value={formData.cause} onChange={handleChange} className={styles.input} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Detail Page / 给客户的指引界面</label>
              <input name="detailPage" value={formData.detailPage} onChange={handleChange} className={styles.input} placeholder="例: /help/timeout" />
            </div>

            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Comments / 评论一下</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} className={styles.textarea} placeholder="还有什么想说的吗？"></textarea>
            </div>

            <div className={styles.fullWidth}>
              <button type="submit" className={`${styles.btn} ${styles.submitBtn}`} disabled={loading || !formData.code}>
                提交
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
