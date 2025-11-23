// API 配置服务 - 统一处理 Web 和 Electron 两种模式

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

export interface ConfigInfo {
  apiKey: string;
  baseUrl: string;
  hasKey: boolean;
}

// 验证 API Key
export async function validateApiKey(config: ApiConfig): Promise<ValidationResult> {
  // Electron 模式
  if (window.electronAPI) {
    return await window.electronAPI.validateApiKey(config);
  }
  
  // Web 模式
  const response = await fetch(`${API_BASE_URL}/api/validate-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  
  const result = await response.json();
  return result;
}

// 更新 API 配置
export async function updateApiConfig(config: ApiConfig): Promise<UpdateResult> {
  // Electron 模式
  if (window.electronAPI) {
    return await window.electronAPI.updateApiConfig(config);
  }
  
  // Web 模式
  const response = await fetch(`${API_BASE_URL}/api/update-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  
  return await response.json();
}

// 获取当前配置
export async function getApiConfig(): Promise<ConfigInfo> {
  // Electron 模式
  if (window.electronAPI) {
    return await window.electronAPI.getApiConfig();
  }
  
  // Web 模式
  const response = await fetch(`${API_BASE_URL}/api/config`);
  return await response.json();
}
