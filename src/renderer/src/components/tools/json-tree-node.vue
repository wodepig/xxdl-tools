<script setup lang="ts">
import { ref } from 'vue'
import type { JsonTreeNode } from '../../../../shared/types/json-formatter'

defineOptions({ name: 'JsonTreeNode' })

const props = defineProps<{ node: JsonTreeNode }>()

const hasChildren = props.node.children !== undefined
// 展开状态由组件实例本地维护，避免直接修改 prop
const expanded = ref(props.node.expanded)

function toggleNode(): void {
  if (hasChildren) {
    expanded.value = !expanded.value
  }
}
</script>

<template>
  <div class="tree-node">
    <div class="node-line" :class="{ clickable: hasChildren }" @click="toggleNode">
      <span v-if="hasChildren" class="arrow" :class="{ open: expanded }">
        <UIcon name="i-heroicons-chevron-right" size="12" />
      </span>
      <span v-else class="arrow-spacer"></span>
      <span v-if="node.key !== null" class="node-key"
        >"{{ node.key }}"<span class="node-colon">:</span></span
      >
      <template v-if="hasChildren">
        <span class="node-bracket">{{ node.type === 'array' ? '[' : '{' }}</span>
        <span class="node-ellipsis">…</span>
        <span class="node-bracket">{{ node.type === 'array' ? ']' : '}' }}</span>
        <span class="node-meta">{{ node.children?.length ?? 0 }} 项</span>
      </template>
      <span v-else class="node-value" :class="'json-' + node.type">{{ node.text }}</span>
    </div>
    <div v-show="expanded" class="node-children">
      <JsonTreeNode v-for="(child, i) in node.children" :key="i" :node="child" />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.node-line {
  display: flex;
  align-items: center;
  min-height: 22px;
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--text-primary);
  white-space: nowrap;
  user-select: text;
  -webkit-user-select: text;
}

.node-line.clickable {
  cursor: pointer;
}

.node-line.clickable:hover {
  background: var(--bg-card-hover);
}

.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 2px;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform 0.15s;
}

.arrow.open {
  transform: rotate(90deg);
}

.arrow-spacer {
  width: 18px;
  flex-shrink: 0;
}

.node-key {
  color: var(--json-key);
}

.node-colon {
  margin-right: 2px;
  color: var(--json-punct);
}

.node-bracket,
.node-ellipsis {
  color: var(--json-punct);
}

.node-meta {
  margin-left: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.node-value {
  color: var(--text-primary);
}

.node-value.json-string {
  color: var(--json-string);
}

.node-value.json-number {
  color: var(--json-number);
}

.node-value.json-boolean {
  color: var(--json-boolean);
}

.node-value.json-null {
  color: var(--json-null);
}

.node-children {
  padding-left: 22px;
}
</style>
