const full = Deno.args.includes("--full");

const command = new Deno.Command(Deno.execPath(), {
  args: ["test", "-A"],
  env: full
    ? {
      ...Deno.env.toObject(),
      MAINZ_TEST_FULL: "1",
    }
    : Deno.env.toObject(),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const result = await command.output();

if (!result.success) {
  Deno.exit(result.code);
}
