import { CopyOutlined, DeleteOutlined, EllipsisOutlined } from "@ant-design/icons"
import {
  Button,
  Checkbox,
  Dropdown,
  Empty,
  List,
  Modal,
  Space,
  Spin,
  Switch,
  Tag
} from "antd"
import { useMemo, useState } from "react"

import { updateRule } from "~/lib/storage"
import type { MockRule } from "~/lib/types"
import { searchRules } from "~/lib/utils"

interface RuleListProps {
  rules: MockRule[];
  selectedRuleId: string | null;
  searchKeyword: string;
  loading: boolean;
  onSelectRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onCopyRule: (rule: MockRule) => void;
  onBatchDelete: (ids: string[]) => void;
}

function RuleList({
  rules,
  selectedRuleId,
  searchKeyword,
  loading,
  onSelectRule,
  onDeleteRule,
  onCopyRule,
  onBatchDelete,
}: RuleListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);

  // 过滤规则
  const filteredRules = useMemo(() => {
    if (!searchKeyword) return rules;
    return searchRules(rules, searchKeyword);
  }, [rules, searchKeyword]);

  // 切换规则启用状态
  const handleToggleEnabled = async (rule: MockRule, enabled: boolean) => {
    await updateRule(rule.id, { enabled });

    // 广播配置更新
    await chrome.runtime.sendMessage({ type: 'BROADCAST_CONFIG' });
  };

  // 删除规则
  const handleDelete = (rule: MockRule) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除规则 "${rule.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => onDeleteRule(rule.id),
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedIds.length} 条规则吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        onBatchDelete(selectedIds);
        setSelectedIds([]);
        setBatchMode(false);
      },
    });
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRules.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 切换选中状态
  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
      ALL: 'default',
    };
    return colors[method] || 'default';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {batchMode && (
        <div style={{
          padding: '12px 16px',
          background: '#f0f2f5',
          borderBottom: '1px solid #d9d9d9',
        }}>
          <Space>
            <Checkbox
              checked={selectedIds.length === filteredRules.length && filteredRules.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < filteredRules.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              全选
            </Checkbox>
            <Button
              size="small"
              danger
              disabled={selectedIds.length === 0}
              onClick={handleBatchDelete}
            >
              删除选中 ({selectedIds.length})
            </Button>
            <Button
              size="small"
              onClick={() => {
                setBatchMode(false);
                setSelectedIds([]);
              }}
            >
              取消
            </Button>
          </Space>
        </div>
      )}

      {!batchMode && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Space>
            <span>共 {filteredRules.length} 条规则</span>
            {filteredRules.length > 0 && (
              <Button
                size="small"
                type="link"
                onClick={() => setBatchMode(true)}
              >
                批量操作
              </Button>
            )}
          </Space>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredRules.length === 0 ? (
          <Empty
            description={searchKeyword ? '未找到匹配的规则' : '暂无规则'}
            style={{ marginTop: 100 }}
          />
        ) : (
          <List
            dataSource={filteredRules}
            renderItem={(rule) => (
              <List.Item
                key={rule.id}
                style={{
                  cursor: 'pointer',
                  background: selectedRuleId === rule.id ? '#e6f7ff' : 'transparent',
                  padding: '12px 16px',
                }}
                onClick={() => !batchMode && onSelectRule(rule.id)}
              >
                <div style={{ width: '100%' }}>
                  {batchMode && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(rule.id)}
                        onChange={() => handleToggleSelect(rule.id)}
                        style={{ marginRight: 8 }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Space>
                        <strong>{rule.name}</strong>
                        <Tag color={getMethodColor(rule.method)}>{rule.method}</Tag>
                        {rule.group && <Tag>{rule.group}</Tag>}
                      </Space>
                    </div>

                    <div style={{
                      fontSize: 12,
                      color: '#999',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {rule.url}
                    </div>

                    {!batchMode && (
                      <div
                        style={{ marginTop: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Space>
                          <Switch
                            size="small"
                            checked={rule.enabled}
                            onChange={(checked) => handleToggleEnabled(rule, checked)}
                          />

                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'copy',
                                  label: '复制',
                                  icon: <CopyOutlined />,
                                  onClick: () => onCopyRule(rule),
                                },
                                {
                                  key: 'delete',
                                  label: '删除',
                                  icon: <DeleteOutlined />,
                                  danger: true,
                                  onClick: () => handleDelete(rule),
                                },
                              ],
                            }}
                            trigger={['click']}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<EllipsisOutlined />}
                            />
                          </Dropdown>
                        </Space>
                      </div>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
}

export default RuleList;
