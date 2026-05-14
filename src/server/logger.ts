import type { TestConfig } from "./config.js";

export type LogSink = (line: string) => void;

export function createConsoleLogger(config: Pick<TestConfig, "logLevel">): LogSink {
  return (line: string) => {
    if (config.logLevel !== "silent") {
      console.log(line);
    }
  };
}
