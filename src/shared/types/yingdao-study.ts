/** 影刀学习时长 - HTTP 请求共享类型（主进程与渲染进程共用） */

export interface HttpRequestParams {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
}

export interface HttpResponse {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  body: string
}
