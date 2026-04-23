"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function ProblemListPage() {
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [problems, setProblems] = useState<any[]>([])

  const fetchProblems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (keyword) params.append('keyword', keyword)
      if (type !== 'ALL') params.append('type', type)
      if (status !== 'ALL') params.append('status', status)

      const res = await fetch(`/api/problem/list?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setProblems(json.data || [])
      } else {
        console.error("Fetch failed:", json.error)
      }
    } catch (e) {
      console.error("Network error:", e)
    }
    setLoading(false)
  }

  // Load initially
  useEffect(() => {
    fetchProblems()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProblems()
  }

  return (
    <div className={styles.container}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>错误码总览</h1>
          <div className={styles.subtitle}>MARTIAN EXCEPTION ：LIST</div>
        </div>

        <form onSubmit={handleSearch} className={styles.filterBar}>
          <input
            type="text"
            className={styles.input}
            placeholder="关键字模糊搜索 (Code, 批次, 原因，提示信息)..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />

          <select className={styles.select} value={type} onChange={e => setType(e.target.value)}>
            <option value="ALL">所有拦截类型 (ALL)</option>
            <option value="BUSINESS">BUSINESS (业务规则)</option>
            <option value="SYSTEM">SYSTEM (系统级)</option>
          </select>

          <select className={styles.select} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ALL">所有状态 (ALL)</option>
            <option value="ACTIVE">ACTIVE (拦截生效中)</option>
            <option value="INACTIVE">INACTIVE (停用)</option>
          </select>

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'SCANNING...' : 'SEARCH'}
          </button>

          <Link href="/pages/problem/edit" className={styles.btnCreate}>
            + CREATE NEW
          </Link>
        </form>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Error Code</th>
                <th>Type</th>
                <th>Status</th>
                <th>Dev Batch</th>
                <th>To User (Houston)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && problems.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.loading}>📡 正在扫描火星地表数据...</td>
                </tr>
              )}

              {!loading && problems.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>🏜️ 没找到对应的错误记录，火星一片荒芜。</td>
                </tr>
              )}

              {problems.map((p) => (
                <tr key={p.id}>
                  <td data-label="Error Code" className={styles.codeCell}>{p.code}</td>
                  <td data-label="Type">
                    <span className={`${styles.badge} ${p.type === 'BUSINESS' ? styles.badgeBusiness : styles.badgeSystem}`}>
                      {p.type}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={`${styles.badge} ${p.status === 'ACTIVE' ? styles.badgeActive : styles.badgeInactive}`}>
                      {p.status}
                    </span>
                  </td>
                  <td data-label="Dev Batch">{p.devBatch}</td>
                  <td data-label="To User (Houston)" className={styles.truncate} title={p.toUser}>{p.toUser}</td>
                  <td data-label="Action" className={styles.actionCell}>
                    <Link href={`/pages/problem/edit?code=${p.code}`} className={styles.actionLink}>
                      EDIT
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
