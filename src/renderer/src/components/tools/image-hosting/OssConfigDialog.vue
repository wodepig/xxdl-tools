<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { OssConfig, ConnectionTestResult, ImageHostingConfig } from '../../../../../shared/types/image-hosting'
import { DEFAULT_PREFS } from '../../../../../shared/types/image-hosting'
import { ipcClient } from '../../../ipc/client'

const props = defineProps<{ visible: boolean; config: OssConfig | null; currentConfig: ImageHostingConfig | null }>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'saved', oss: OssConfig): void
  (e: 'notify', msg: string, type: 'success' | 'error' | 'info'): void
}>()

const form = reactive<OssConfig>({
  region: '',
  accessKeyId: '',
  accessKeySecret: '',
  bucket: '',
  endpoint: '',
  customDomain: '',
  pathPrefix: '',
  namingRule: 'timestamp',
  pathTemplate: ''
})

watch(
  () => props.visible,
  (v) => {
    if (v && props.config) {
      Object.assign(form, props.config)
    } else if (v) {
      Object.assign(form, {
        region: '',
        accessKeyId: '',
        accessKeySecret: '',
        bucket: '',
        endpoint: '',
        customDomain: '',
        pathPrefix: '',
        namingRule: 'timestamp',
        pathTemplate: ''
      })
    }
  },
  { immediate: true }
)

const testing = ref(false)
const testResult = ref<ConnectionTestResult | null>(null)
const saving = ref(false)

async function testConnection(): Promise<void> {
  if (!form.region || !form.accessKeyId || !form.accessKeySecret || !form.bucket) {
    testResult.value = { ok: false, message: '请填写必填项' }
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const result = await ipcClient.imageHosting.testConnection({ ...form })
    testResult.value = result
  } catch (err) {
    testResult.value = { ok: false, message: String(err) }
  } finally {
    testing.value = false
  }
}

async function save(): Promise<void> {
  if (!form.region || !form.accessKeyId || !form.accessKeySecret || !form.bucket) {
    testResult.value = { ok: false, message: '请填写必填项' }
    return
  }
  saving.value = true
  try {
    // 统一深拷贝，彻底脱离 Vue reactive proxy（Electron IPC 无法克隆 Proxy 对象）
    const configToSave: ImageHostingConfig = JSON.parse(JSON.stringify({
      provider: 'oss',
      oss: form,
      prefs: props.currentConfig?.prefs || { ...DEFAULT_PREFS }
    }))
    // 直接调用 IPC 保存，确保磁盘写入成功
    await ipcClient.imageHosting.saveConfig(configToSave)
    // 保存成功后再通知主页面更新内存状态
    emit('saved', configToSave.oss)
    emit('notify', 'OSS 配置已保存', 'success')
    emit('update:visible', false)
  } catch (e) {
    emit('notify', `保存失败: ${e}`, 'error')
  } finally {
    saving.value = false
  }
}

function close(): void {
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[200] flex items-center justify-center" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);" @click.self="close">
      <div class="w-[520px] max-w-[90vw] max-h-[85vh] overflow-y-auto rounded-2xl border" :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <!-- 头部 -->
        <div class="flex items-center justify-between border-b px-6 py-4" :style="{ borderColor: 'var(--border)' }">
          <h2 class="flex items-center gap-2 text-base font-semibold" :style="{ color: 'var(--text-primary)' }">
            <UIcon name="i-heroicons-cog-6-solid" size="18" style="color: #06b6d4;" />
            OSS 配置
          </h2>
          <button class="flex h-7 w-7 items-center justify-center rounded-md" :style="{ color: 'var(--text-secondary)' }" @click="close">
            <UIcon name="i-heroicons-x-mark" size="18" />
          </button>
        </div>

        <!-- 表单 -->
        <div class="flex flex-col gap-4 px-6 py-5">
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">区域 Region <span style="color: #ef4444;">*</span></label>
              <input v-model="form.region" type="text" placeholder="如 oss-cn-hangzhou" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">Bucket 名称 <span style="color: #ef4444;">*</span></label>
              <input v-model="form.bucket" type="text" placeholder="Bucket 名称" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">AccessKey ID <span style="color: #ef4444;">*</span></label>
            <input v-model="form.accessKeyId" type="text" placeholder="阿里云 RAM 用户 AccessKey ID" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">AccessKey Secret <span style="color: #ef4444;">*</span></label>
            <input v-model="form.accessKeySecret" type="password" placeholder="阿里云 RAM 用户 AccessKey Secret" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">Endpoint</label>
            <input v-model="form.endpoint" type="text" placeholder="留空则使用 {region}.aliyuncs.com" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
            <span class="text-[11px]" :style="{ color: 'var(--text-muted)' }">默认使用 {region}.aliyuncs.com，自定义域名请填写完整地址</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">自定义域名</label>
            <input v-model="form.customDomain" type="text" placeholder="如 https://img.example.com" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
            <span class="text-[11px]" :style="{ color: 'var(--text-muted)' }">绑定 CDN 或自定义域名后填写，留空则使用 Bucket 默认域名</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">存储路径前缀</label>
              <input v-model="form.pathPrefix" type="text" placeholder="如 uploads/（pathTemplate 为空时生效）" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">文件命名规则</label>
              <select v-model="form.namingRule" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }">
                <option value="keep">保留原名</option>
                <option value="timestamp">时间戳 + 随机串</option>
                <option value="date-archive">按日期归档</option>
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs" :style="{ color: 'var(--text-secondary)' }">路径模板（优先于上方前缀+命名规则）</label>
            <input v-model="form.pathTemplate" type="text" placeholder="{Y}/{M}/{no_filename}{since_millisecond}-{Y}-{M}-{D}-{H}{m}{s}.{suffix}" class="rounded-[10px] border px-3.5 py-2.5 text-[13px] outline-none" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: 'SF Mono, Monaco, monospace' }">
            <span class="text-[11px] leading-relaxed" :style="{ color: 'var(--text-muted)' }">
              占位符：{Y}年 {M}月 {D}日 {H}时 {m}分 {s}秒 {no_filename}原名 {since_millisecond}毫秒时间戳 {suffix}扩展名。示例：{Y}/{M}/{no_filename}{since_millisecond}-{Y}-{M}-{D}-{H}{m}{s}.{suffix}
            </span>
          </div>

          <!-- 测试结果 -->
          <div v-if="testResult" class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" :style="{
            backgroundColor: testResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: testResult.ok ? '#10b981' : '#ef4444'
          }">
            <UIcon :name="testResult.ok ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'" size="14" />
            <span>{{ testResult.message }}</span>
          </div>
        </div>

        <!-- 底部 -->
        <div class="flex justify-end gap-2 border-t px-6 py-4" :style="{ borderColor: 'var(--border)' }">
          <button class="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px]" :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }" @click="close">取消</button>
          <button class="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px]" :disabled="testing" :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)', opacity: testing ? 0.6 : 1 }" @click="testConnection">
            <UIcon :name="testing ? 'i-heroicons-arrow-path' : 'i-heroicons-plug'" size="14" :class="testing ? 'animate-spin' : ''" />
            测试连接
          </button>
          <button class="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white" :disabled="saving" :style="{ backgroundColor: '#06b6d4', opacity: saving ? 0.6 : 1 }" @click="save">
            <UIcon name="i-heroicons-bookmark" size="14" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
