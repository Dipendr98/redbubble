import { COMPOSITION_BRIEF } from "../agents/CompositionAgent.js";
import { ANATOMY_BRIEF } from "../agents/AnatomyAgent.js";
import { VISUAL_BRIEF } from "../agents/VisualAgent.js";

/**
 * ORCHESTRATOR: Trained to 'Consolidate and Perfect'.
 * Role: Coordinates the Agents to produce the final 'Masterpiece Brief'.
 */
export async function optimizePrompt(userPrompt, githubToken) {
  if (!githubToken) return userPrompt;
  
  const SYSTEM_PROMPT = `You are the Leader of the "Council of Sticker Agents".
Your mission: Take the user input and the reports from your 3 specialized Agents to create the ONE PERFECT PROMPT.

AGENT REPORTS (INTERNAL DATA):
1. ${COMPOSITION_BRIEF}
2. ${ANATOMY_BRIEF}
3. ${VISUAL_BRIEF}

CONSOLIDATION RULES:
- Mathematical centering and no cutoffs.
- Absolute subject clarity (no blending).
- Cinematic lighting and 8K sharp detail.
- Professional white die-cut outline.
- Output ONLY the consolidated prompt text (STRICTLY max 350 chars).`;

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${githubToken}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Leader, perfect this idea: "${userPrompt}"` }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    const data = await response.json();
    return data.choices[0].message.content.replace(/^"|"$/g, '').trim();
  } catch (error) {
    console.warn("Orchestration failed, falling back to raw prompt.");
    return userPrompt;
  }
}
