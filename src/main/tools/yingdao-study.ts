import { ipcMain } from 'electron'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import type { HttpRequestParams, HttpResponse } from '../../shared/types/yingdao-study'

export function registerYingdaoStudyHandlers(): void {
  ipcMain.handle('yingdao-study:send-request', async (
    _event,
    params: HttpRequestParams
  ): Promise<HttpResponse> => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(params.url)
      const isHttps = urlObj.protocol === 'https:'
      const lib = isHttps ? httpsRequest : httpRequest

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: params.method.toUpperCase(),
        headers: params.headers || {}
      }

      const req = lib(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8')
          resolve({
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage || '',
            headers: res.headers as Record<string, string>,
            body
          })
        })
      })

      req.on('error', (err) => {
        reject(new Error(err.message))
      })

      if (params.body) {
        req.write(params.body)
      }

      req.end()
    })
  })
}
