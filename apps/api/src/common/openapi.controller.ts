import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class OpenApiController {
  private findOpenApiPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'packages/contracts/CORE_COMMANDS.openapi.yaml'),
      path.resolve(process.cwd(), 'contracts/CORE_COMMANDS.openapi.yaml'),
      path.resolve(process.cwd(), '../../contracts/CORE_COMMANDS.openapi.yaml'),
      path.resolve(__dirname, '../../../contracts/CORE_COMMANDS.openapi.yaml'),
      'b:/PROJECTS/EOS/contracts/CORE_COMMANDS.openapi.yaml',
      'B:/PROJECTS/EOS/contracts/CORE_COMMANDS.openapi.yaml',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0];
  }

  @Get('openapi.yaml')
  getOpenApiYaml(@Res() res: Response) {
    const filePath = this.findOpenApiPath();
    if (!fs.existsSync(filePath)) {
      res.status(404).send('OpenAPI contract file not found');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(content);
  }

  @Get('docs')
  getApiDocs(@Res() res: Response) {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>E3-EOS Core Command API Reference</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.yaml"
      data-proxy-url=""
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
