export class ClientRouteBoardService {
  title(): string {
    return "DI Dispatch";
  }
}

export class ClientStorySummaryService {
  readonly messages = new Map<string, string>([
    ["signal-from-di", "DI composed the client route summary."],
  ]);

  describe(slug: string): string {
    return this.messages.get(slug) ??
      `Unexpected summary for ${slug}`;
  }
}
