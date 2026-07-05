import { ref, computed } from 'vue'
import type { ToolDefinition } from '../../../shared/types/tool'
import { tools, categories } from '../data/tools'

function useToolsStoreInternal() {
  const searchQuery = ref('')
  const activeCategory = ref('all')

  const filteredTools = computed<ToolDefinition[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const category = activeCategory.value

    let filtered = tools

    // 按分类筛选
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category)
    }

    // 按搜索词筛选
    if (query) {
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  })

  function setSearch(query: string) {
    searchQuery.value = query
  }

  function setCategory(category: string) {
    activeCategory.value = category
  }

  return {
    searchQuery,
    activeCategory,
    filteredTools,
    setSearch,
    setCategory,
    categories,
    tools
  }
}

// 单例模式导出
let instance: ReturnType<typeof useToolsStoreInternal> | null = null
export function useToolsStore(): ReturnType<typeof useToolsStoreInternal> {
  if (!instance) {
    instance = useToolsStoreInternal()
  }
  return instance
}
