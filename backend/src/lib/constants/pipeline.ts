export const PIPELINE_STAGES = [
  "New Lead", "Qualified", "Discovery", "Technical Review",
  "Proposal Sent", "Module Selection", "Contract Review",
  "Closed Won", "Closed Lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "New Lead":         { bg: "bg-blue-950/50",    text: "text-blue-400",    border: "border-blue-800" },
  "Qualified":        { bg: "bg-indigo-950/50",  text: "text-indigo-400",  border: "border-indigo-800" },
  "Discovery":        { bg: "bg-cyan-950/50",    text: "text-cyan-400",    border: "border-cyan-800" },
  "Technical Review": { bg: "bg-yellow-950/50",  text: "text-yellow-400",  border: "border-yellow-800" },
  "Proposal Sent":    { bg: "bg-orange-950/50",  text: "text-orange-400",  border: "border-orange-800" },
  "Module Selection": { bg: "bg-pink-950/50",    text: "text-pink-400",    border: "border-pink-800" },
  "Contract Review":  { bg: "bg-purple-950/50",  text: "text-purple-400",  border: "border-purple-800" },
  "Closed Won":       { bg: "bg-green-950/50",   text: "text-green-400",   border: "border-green-800" },
  "Closed Lost":      { bg: "bg-red-950/50",     text: "text-red-400",     border: "border-red-800" },
};

export const STAGE_PROBABILITIES: Record<string, number> = {
  "New Lead": 5, "Qualified": 15, "Discovery": 25, "Technical Review": 40,
  "Proposal Sent": 55, "Module Selection": 70, "Contract Review": 85,
  "Closed Won": 100, "Closed Lost": 0,
};
