import type { AgentRequest, AgentResponse, AgentContext } from "@agentuity/sdk";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export default async function Agent(
	req: AgentRequest,
	resp: AgentResponse,
	ctx: AgentContext
) {
	console.log("beans");
	// ctx.kv.set("beans", "beans", "beans");
	const res = await generateText({
		model: openai("gpt-4o"),
		system: "You are a friendly assistant!",
		prompt: req.data.text ?? "Why is the sky blue?",
	});

	const agent = await ctx.getAgent({ name: "agent2" });

	const agent2res = await agent.run({
		data: res.text,
		contentType: "text/plain",
	});

	return resp.text(agent2res.data.text);
}
