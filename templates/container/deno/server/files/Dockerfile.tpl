{{dockerfileHeader}}
FROM {{denoContainerImage}} AS builder
WORKDIR /workspace
COPY . .
RUN deno task build --target {{targetName}} --profile {{profileName}} --config {{configPath}}

FROM {{denoContainerImage}}
WORKDIR /workspace
COPY --from=builder /workspace /workspace
EXPOSE 3000
CMD ["deno", "run", "-A", "./src/cli/preview-artifact.ts", {{artifactRootDir}}, "--host", "0.0.0.0", "--port", "3000"]

