import { tool } from "@opencode-ai/plugin"

export const pdf = tool({
  description: "Export Slidev presentation to PDF",
  args: {
    input: tool.schema.string().default("slides.md").describe("Path to the Slidev markdown file"),
    output: tool.schema.string().default("./output/presentation.pdf").describe("Output PDF path"),
    timeout: tool.schema.number().default(60000).describe("Playwright timeout in ms"),
  },
  async execute(args, context) {
    const proc = Bun.spawn([
      "npx", "slidev", "export", args.input,
      "--output", args.output,
      "--timeout", String(args.timeout),
    ], {
      cwd: context.worktree,
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    const stderr = await new Response(proc.stderr).text()
    if (proc.exitCode !== 0) {
      return `Export PDF failed (exit ${proc.exitCode}): ${stderr}`
    }
    return `PDF exported to ${args.output}`
  },
})

export const pptx = tool({
  description: "Export Slidev presentation to PPTX",
  args: {
    input: tool.schema.string().default("slides.md").describe("Path to the Slidev markdown file"),
    output: tool.schema.string().default("./output/presentation.pptx").describe("Output PPTX path"),
    timeout: tool.schema.number().default(120000).describe("Playwright timeout in ms"),
  },
  async execute(args, context) {
    const proc = Bun.spawn([
      "npx", "slidev", "export", args.input,
      "--format", "pptx",
      "--output", args.output,
      "--timeout", String(args.timeout),
      "--wait-until", "load",
    ], {
      cwd: context.worktree,
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    const stderr = await new Response(proc.stderr).text()
    if (proc.exitCode !== 0) {
      return `Export PPTX failed (exit ${proc.exitCode}): ${stderr}`
    }
    return `PPTX exported to ${args.output}`
  },
})

export const png = tool({
  description: "Export Slidev presentation as individual PNG slide images in a named directory",
  args: {
    input: tool.schema.string().default("slides.md").describe("Path to the Slidev markdown file"),
    name: tool.schema.string().default("presentation").describe("Slugified presentation name for the output directory"),
    timeout: tool.schema.number().default(120000).describe("Playwright timeout in ms"),
  },
  async execute(args, context) {
    const outputDir = `./output/${args.name}`
    const proc = Bun.spawn([
      "npx", "slidev", "export", args.input,
      "--format", "png",
      "--output", outputDir,
      "--timeout", String(args.timeout),
      "--wait-until", "load",
    ], {
      cwd: context.worktree,
      stdout: "pipe",
      stderr: "pipe",
    })
    await proc.exited
    const stderr = await new Response(proc.stderr).text()
    if (proc.exitCode !== 0) {
      return `Export PNG failed (exit ${proc.exitCode}): ${stderr}`
    }
    const glob = new Bun.Glob("*.png")
    const files = [...glob.scanSync({ cwd: `${context.worktree}/${outputDir}` })]
    return `PNG exported to ${outputDir}/ (${files.length} slides)`
  },
})
