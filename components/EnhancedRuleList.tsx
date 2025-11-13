import {
  CopyOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  GroupOutlined,
  TagOutlined
} from "@ant-design/icons"
import {
  Button,
  Checkbox,
  Collapse,
  Divider,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message
} from "antd"
import { useMemo, useState } from "react"

import { updateRule } from "~/lib/storage"
import type { MockRule } from "~/lib/types"
import { getAllGroups, searchRules } from "~/lib/utils"

const { Text } = Typography
const { Panel } = Collapse

interface EnhancedRuleListProps {
  rules: MockRule[]
  selectedRuleId: string | null
  searchKeyword: string
  loading: boolean
  onSelectRule: (id: string) => void
  onDeleteRule: (id: string) => void
  onCopyRule: (rule: MockRule) => void
  onBatchDelete: (ids: string[]) => void
  onUpdateRule: (id: string, updates: Partial<MockRule>) => void
}

function EnhancedRuleList({
  rules,
  selectedRuleId,
  searchKeyword,
  loading,
  onSelectRule,
  onDeleteRule,
  onCopyRule,
  onBatchDelete,
  onUpdateRule
}: EnhancedRuleListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")
  const [editingGroupRule, setEditingGroupRule] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState("")

  // 获取所有分组
  const groups = useMemo(() => getAllGroups(rules), [rules])

  // 过滤和分组规则
  const { groupedRules, ungroupedRules } = useMemo(() => {
    let filtered = rules

    // 搜索过滤
    if (searchKeyword) {
      filtered = searchRules(filtered, searchKeyword)
    }

    // 分组过滤
    if (selectedGroup !== "ALL") {
      if (selectedGroup === "UNGROUPED") {
        filtered = filtered.filter(r => !r.group)
      } else {
        filtered = filtered.filter(r => r.group === selectedGroup)
      }
    }

    // 分组
    const grouped: Record<string, MockRule[]> = {}
    const ungrouped: MockRule[] = []

    filtered.forEach(rule => {
      if (rule.group) {
        if (!grouped[rule.group]) {
          grouped[rule.group] = []
        }
        grouped[rule.group].push(rule)
      } else {
        ungrouped.push(rule)
      }
    })

    return { groupedRules: grouped, ungroupedRules: ungrouped }
  }, [rules, searchKeyword, selectedGroup])

  // 切换规则启用状态
  const handleToggleEnabled = async (rule: MockRule, enabled: boolean) => {
    await updateRule(rule.id, { enabled })
    await chrome.runtime.sendMessage({ type: "BROADCAST_CONFIG" })
  }

  // 更新规则分组
  const handleUpdateGroup = async (ruleId: string, group: string | undefined) => {
    await updateRule(ruleId, { group: group || undefined })
    onUpdateRule(ruleId, { group: group || undefined })
    setEditingGroupRule(null)
    setNewGroupName("")
    message.success("分组已更新")
  }

  // 批量更新分组
  const handleBatchUpdateGroup = async (group: string | undefined) => {
    const promises = selectedIds.map(id =>
      updateRule(id, { group: group || undefined })
    )
    await Promise.all(promises)

    selectedIds.forEach(id => {
      onUpdateRule(id, { group: group || undefined })
    })

    setSelectedIds([])
    setBatchMode(false)
    message.success(`已更新 ${selectedIds.length} 条规则的分组`)
  }

  // 删除规则
  const handleDelete = (rule: MockRule) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除规则 "${rule.name}" 吗？`,
      okText: "确定",
      cancelText: "取消",
      onOk: () => onDeleteRule(rule.id)
    })
  }

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: "批量删除",
      content: `确定要删除选中的 ${selectedIds.length} 条规则吗？`,
      okText: "确定",
      cancelText: "取消",
      onOk: () => {
        onBatchDelete(selectedIds)
        setSelectedIds([])
        setBatchMode(false)
      }
    })
  }

  // 渲染规则项
  const renderRuleItem = (rule: MockRule) => {
    const isSelected = selectedRuleId === rule.id
    const isChecked = selectedIds.includes(rule.id)

    return (
      <div
        key={rule.id}
        className={`rule-item ${isSelected ? "selected" : ""}`}
        onClick={() => !batchMode && onSelectRule(rule.id)}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          background: isSelected ? "#e6f7ff" : undefined,
          borderLeft: isSelected ? "3px solid #1890ff" : "3px solid transparent",
          marginBottom: 4,
          transition: "all 0.3s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Space>
            {batchMode && (
              <Checkbox
                checked={isChecked}
                onChange={() => handleToggleSelect(rule.id)}
                onClick={e => e.stopPropagation()}
              />
            )}
            <Switch
              size="small"
              checked={rule.enabled}
              onChange={(checked) => handleToggleEnabled(rule, checked)}
              onClick={e => (e as any).stopPropagation()}
            />
            <Text strong={isSelected} style={{ flex: 1 }}>
              {rule.name}
            </Text>
          </Space>

          <Space>
            <Tag color={getMethodColor(rule.method)}>{rule.method}</Tag>
            {rule.group && (
              <Tag icon={<FolderOutlined />} color="blue">
                {rule.group}
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {rule.usageCount || 0} 次
            </Text>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "group",
                    label: "设置分组",
                    icon: <GroupOutlined />,
                    onClick: () => {
                      setEditingGroupRule(rule.id)
                      setNewGroupName(rule.group || "")
                    }
                  },
                  {
                    key: "copy",
                    label: "复制",
                    icon: <CopyOutlined />,
                    onClick: () => onCopyRule(rule)
                  },
                  { type: "divider" },
                  {
                    key: "delete",
                    label: "删除",
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDelete(rule)
                  }
                ]
              }}
              trigger={["click"]}
            >
              <Button
                type="text"
                size="small"
                icon={<EllipsisOutlined />}
                onClick={e => e.stopPropagation()}
              />
            </Dropdown>
          </Space>
        </div>

        {rule.description && (
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            {rule.description}
          </Text>
        )}

        {/* 分组编辑 */}
        {editingGroupRule === rule.id && (
          <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
            <Space.Compact style={{ width: "100%" }}>
              <Select
                style={{ flex: 1 }}
                placeholder="选择或输入分组"
                value={newGroupName}
                onChange={setNewGroupName}
                showSearch
                allowClear
                options={[
                  { label: "无分组", value: "" },
                  ...groups.map(g => ({ label: g, value: g }))
                ]}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: "8px 0" }} />
                    <Input
                      placeholder="输入新分组名称"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onPressEnter={() => handleUpdateGroup(rule.id, newGroupName)}
                    />
                  </>
                )}
              />
              <Button
                type="primary"
                onClick={() => handleUpdateGroup(rule.id, newGroupName)}
              >
                确定
              </Button>
              <Button onClick={() => setEditingGroupRule(null)}>
                取消
              </Button>
            </Space.Compact>
          </div>
        )}
      </div>
    )
  }

  // 获取方法颜色
  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "blue",
      POST: "green",
      PUT: "orange",
      DELETE: "red",
      PATCH: "purple",
      ALL: "default"
    }
    return colors[method] || "default"
  }

  // 切换选中
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin />
      </div>
    )
  }

  const totalRules = Object.keys(groupedRules).reduce(
    (sum, group) => sum + groupedRules[group].length,
    ungroupedRules.length
  )

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 工具栏 */}
      <div style={{
        padding: "12px 16px",
        background: "#fafafa",
        borderBottom: "1px solid #f0f0f0"
      }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          {/* 分组筛选 */}
          <Select
            style={{ width: "100%" }}
            placeholder="筛选分组"
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={[
              { label: `所有分组 (${rules.length})`, value: "ALL" },
              { label: `未分组 (${rules.filter(r => !r.group).length})`, value: "UNGROUPED" },
              ...groups.map(g => ({
                label: `${g} (${rules.filter(r => r.group === g).length})`,
                value: g
              }))
            ]}
          />

          {/* 批量操作 */}
          {batchMode ? (
            <Space>
              <Checkbox
                checked={selectedIds.length === totalRules && totalRules > 0}
                indeterminate={selectedIds.length > 0 && selectedIds.length < totalRules}
                onChange={(e) => {
                  if (e.target.checked) {
                    const allIds = [...ungroupedRules, ...Object.values(groupedRules).flat()]
                      .map(r => r.id)
                    setSelectedIds(allIds)
                  } else {
                    setSelectedIds([])
                  }
                }}
              >
                全选 ({selectedIds.length}/{totalRules})
              </Checkbox>
              <Button
                size="small"
                onClick={() => {
                  const groupName = prompt("输入分组名称（留空表示取消分组）")
                  if (groupName !== null) {
                    handleBatchUpdateGroup(groupName || undefined)
                  }
                }}
              >
                设置分组
              </Button>
              <Button
                size="small"
                danger
                disabled={selectedIds.length === 0}
                onClick={handleBatchDelete}
              >
                删除选中
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setBatchMode(false)
                  setSelectedIds([])
                }}
              >
                取消
              </Button>
            </Space>
          ) : (
            <Button size="small" onClick={() => setBatchMode(true)}>
              批量管理
            </Button>
          )}
        </Space>
      </div>

      {/* 规则列表 */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
        {totalRules === 0 ? (
          <Empty description="暂无规则" />
        ) : (
          <>
            {/* 分组规则 */}
            {Object.keys(groupedRules).length > 0 && (
              <Collapse
                activeKey={expandedGroups}
                onChange={setExpandedGroups as any}
                expandIconPosition="start"
              >
                {Object.entries(groupedRules).map(([group, groupRules]) => (
                  <Panel
                    header={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space>
                          <FolderOutlined />
                          <Text strong>{group}</Text>
                          <Tag>{groupRules.length} 条规则</Tag>
                        </Space>
                        <Tag color="green">
                          {groupRules.filter(r => r.enabled).length} 启用
                        </Tag>
                      </div>
                    }
                    key={group}
                  >
                    {groupRules.map(renderRuleItem)}
                  </Panel>
                ))}
              </Collapse>
            )}

            {/* 未分组规则 */}
            {ungroupedRules.length > 0 && (
              <div style={{ marginTop: Object.keys(groupedRules).length > 0 ? 16 : 0 }}>
                {Object.keys(groupedRules).length > 0 && (
                  <Divider orientation="left">
                    <Space>
                      <TagOutlined />
                      <Text type="secondary">未分组规则 ({ungroupedRules.length})</Text>
                    </Space>
                  </Divider>
                )}
                {ungroupedRules.map(renderRuleItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default EnhancedRuleList