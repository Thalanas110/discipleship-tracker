import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

vi.mock("@/lib/invoke", () => ({
  invoke: vi.fn(),
}));

import { discipleService } from "@/integrations/supabase/services/discipleService";

describe("discipleService relations query", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getUser.mockResolvedValue({ data: { user: { id: "leader-1" } } });

    const query = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
    };

    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.order.mockResolvedValue({ data: [], error: null });
    mocks.from.mockReturnValue(query);
  });

  it("uses profile foreign-key relationships for leader and disciple joins", async () => {
    await discipleService.listMyDisciples();

    expect(mocks.select).toHaveBeenCalledWith(
      "*, disciple:profiles!discipleship_relationships_disciple_profile_id_fkey(*), leader:profiles!discipleship_relationships_leader_profile_id_fkey(*)",
    );
  });
});
