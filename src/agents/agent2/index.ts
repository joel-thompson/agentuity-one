import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext
) {
	const res = await generateText({
		model: openai("gpt-4o"),
		system: "You are a helpful assistant that summarizes text.",
		prompt: req.data.text ?? "No text provided",
	});
	return resp.json({
		originalText: req.data.text,
		summary: res.text,
	});
}
