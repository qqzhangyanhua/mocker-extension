import { DeleteOutlined, SaveOutlined } from "@ant-design/icons"
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  message
} from "antd"
import { useEffect, useState } from "react"

import { validateUrlPattern } from "~/lib/matcher"
import type { MockRule, ResponseType } from "~/lib/types"
import { isValidJSON } from "~/lib/utils"

const { TextArea } = Input;

interface RuleEditorProps {
  rule: MockRule;
  onSave: (rule: MockRule) => void;
  onDelete: (id: string) => void;
}

function RuleEditor({ rule, onSave, onDelete }: RuleEditorProps) {
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [responseType, setResponseType] = useState<ResponseType>(rule.responseType);

  useEffect(() => {
    form.setFieldsValue(rule);
    setResponseType(rule.responseType);
    setHasChanges(false);
  }, [rule, form]);

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 验证 JSON 格式
      if (values.responseType === 'json') {
        try {
          JSON.parse(values.responseBody);
        } catch {
          message.error('响应体不是有效的 JSON 格式，请检查并修正');
          form.scrollToField('responseBody');
          return;
        }
      }

      // 验证 URL 模式
      if (!values.url || values.url.trim() === '') {
        message.error('URL 模式不能为空');
        form.scrollToField('url');
        return;
      }

      const updatedRule: MockRule = {
        ...rule,
        ...values,
        updatedAt: Date.now(),
      };

      onSave(updatedRule);
      setHasChanges(false);
      message.success('规则保存成功');
    } catch (err: any) {
      // 详细的错误提示
      const errorFields = err?.errorFields;
      if (errorFields && errorFields.length > 0) {
        const firstError = errorFields[0];
        const fieldName = firstError.name[0];
        const errorMsg = firstError.errors[0];

        // 字段名映射
        const fieldMap: Record<string, string> = {
          name: '规则名称',
          url: 'URL 模式',
          method: '请求方法',
          statusCode: '状态码',
          delay: '延迟时间',
          responseBody: '响应体',
          responseType: '响应类型'
        };

        const fieldLabel = fieldMap[fieldName] || fieldName;
        message.error(`${fieldLabel}: ${errorMsg}`);

        // 滚动到错误字段
        form.scrollToField(fieldName);
      } else {
        message.error('请检查表单填写是否正确');
      }
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除规则 "${rule.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => onDelete(rule.id),
    });
  };

  const handleFormatJSON = () => {
    const value = form.getFieldValue('responseBody');
    if (!value || value.trim() === '') {
      message.warning('响应体为空，无需格式化');
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      form.setFieldValue('responseBody', formatted);
      message.success('JSON 格式化成功');
    } catch (err: any) {
      // 尝试解析错误位置
      const errorMatch = err.message.match(/position (\d+)/);
      if (errorMatch) {
        const position = parseInt(errorMatch[1]);
        const lines = value.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        message.error(`JSON 格式错误（第 ${line} 行，第 ${column} 列）: ${err.message}`);
      } else {
        message.error(`JSON 格式错误: ${err.message}`);
      }
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ margin: 0 }}>编辑规则</h2>
        <Space>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={rule}
      >
        <Divider orientation="left">基础信息</Divider>

        <Form.Item
          label="规则名称"
          name="name"
          rules={[
            { required: true, message: '请输入规则名称' },
            { max: 50, message: '名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="请输入规则名称" />
        </Form.Item>

        <Form.Item
          label="规则描述"
          name="description"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        >
          <TextArea
            placeholder="请输入规则描述（可选）"
            rows={2}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item label="启用状态" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          label="分组标签"
          name="group"
        >
          <Input placeholder="请输入分组标签（可选）" />
        </Form.Item>

        <Divider orientation="left">匹配条件</Divider>

        <Form.Item
          label="URL匹配规则"
          name="url"
          rules={[
            { required: true, message: '请输入URL' },
            {
              validator: (_, value) => {
                const matchType = form.getFieldValue('matchType');
                if (validateUrlPattern(value, matchType)) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('URL格式无效'));
              },
            },
          ]}
        >
          <Input placeholder="请输入URL" />
        </Form.Item>

        <Form.Item
          label="匹配类型"
          name="matchType"
          tooltip="精确匹配：URL完全相同 | 前缀匹配：URL以指定字符串开头 | 包含匹配：URL包含指定字符串 | 正则匹配：使用正则表达式"
        >
          <Select>
            <Select.Option value="exact">精确匹配</Select.Option>
            <Select.Option value="prefix">前缀匹配</Select.Option>
            <Select.Option value="contains">包含匹配</Select.Option>
            <Select.Option value="regex">正则匹配</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="HTTP方法"
          name="method"
        >
          <Select>
            <Select.Option value="ALL">ALL</Select.Option>
            <Select.Option value="GET">GET</Select.Option>
            <Select.Option value="POST">POST</Select.Option>
            <Select.Option value="PUT">PUT</Select.Option>
            <Select.Option value="DELETE">DELETE</Select.Option>
            <Select.Option value="PATCH">PATCH</Select.Option>
          </Select>
        </Form.Item>

        <Divider orientation="left">响应配置</Divider>

        <Form.Item
          label="HTTP状态码"
          name="statusCode"
          rules={[
            { required: true, message: '请输入状态码' },
            { type: 'number', min: 100, max: 599, message: '状态码必须在100-599之间' },
          ]}
        >
          <InputNumber style={{ width: '100%' }} placeholder="200" />
        </Form.Item>

        <Form.Item
          label="响应延迟（毫秒）"
          name="delay"
          tooltip="模拟网络延迟，0表示无延迟"
          rules={[
            { type: 'number', min: 0, max: 60000, message: '延迟必须在0-60000毫秒之间' },
          ]}
        >
          <InputNumber style={{ width: '100%' }} placeholder="0" />
        </Form.Item>

        <Form.Item
          label="响应类型"
          name="responseType"
        >
          <Select onChange={(value) => setResponseType(value)}>
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="text">Text</Select.Option>
            <Select.Option value="html">HTML</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="响应内容"
          name="responseBody"
          rules={[
            { required: true, message: '请输入响应内容' },
            {
              validator: (_, value) => {
                if (responseType === 'json' && !isValidJSON(value)) {
                  return Promise.reject(new Error('JSON格式无效'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <TextArea
            rows={12}
            placeholder="请输入响应内容"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        {responseType === 'json' && (
          <Form.Item>
            <Button onClick={handleFormatJSON}>格式化JSON</Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
}

export default RuleEditor;
