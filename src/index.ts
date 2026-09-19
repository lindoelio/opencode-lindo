import { Plugin } from "@opencode/plugin";
import { parseOptions } from "./options.js";
import { createRuntime } from "./runtime.js";
import { registerCommands } from "./catalog/command-registration.js";
import { registerSkills } from "./catalog/skill-registration.js";
import { registerTools } from "./tools/index.js";
import { registerHooks } from "./hooks/index.js";

export default Plugin.define({
  id: "lindoelio.lindo",
  async setup(ctx) {
    const options = parseOptions(ctx.options);
    const runtime = createRuntime(ctx, options);

    const registrations = await Promise.all([
      registerCommands(runtime),
      registerSkills(runtime),
      registerTools(runtime),
      registerHooks(runtime),
    ]);

    return async () => {
      await Promise.all(registrations.map((registration) => registration.dispose()));
    };
  },
});
