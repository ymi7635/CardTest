import { useState } from 'react'
import { PROFILE_FIELDS } from '../../shared/domain/config'
import type { Profile } from '../../shared/domain/types'
import { useSheetAction } from '../../shared/hooks/useSheetAction'
import FormError from '../../shared/ui/FormError'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'

/** 修改個人資料（紀念日與生日是固定的，不能改） */
export default function EditProfileSheet() {
  const { state, actions, offline } = useCardData()
  const { closeSheet, toast } = useUI()
  const submit = useSheetAction()
  const [form, setForm] = useState<Profile>(() => ({ ...(state.profile as Profile) }))

  const valid = PROFILE_FIELDS.every((f) => form[f.key].trim())

  const save = async () => {
    if (!valid) return
    const ok = await submit.run(() => actions.updateProfile(form), { fallback: '儲存失敗，請稍後再試' })
    if (!ok) return
    toast('資料已更新 ♡')
    closeSheet()
  }

  return (
    <>
      <h3>修改資料</h3>
      <p>紀念日和生日是固定的，其他都可以改</p>
      <div className="form">
        {PROFILE_FIELDS.map((f) => (
          <label key={f.key}>
            <span>{f.label}</span>
            <input
              type="text"
              value={form[f.key]}
              maxLength={f.maxLength}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <FormError text={submit.error || (offline ? '目前離線，暫時無法儲存' : '')} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          取消
        </button>
        <button className="btn btn-primary" disabled={!valid || submit.busy || offline} onClick={() => void save()}>
          儲存
        </button>
      </div>
    </>
  )
}
