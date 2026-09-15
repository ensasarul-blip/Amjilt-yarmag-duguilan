import { describe, expect, it } from "vitest";
import {
  findConflicts,
  formatTime,
  sessionsOverlap,
  timeToMinutes,
  type ClubLike,
} from "@/lib/overlap";

const taekwondo3: ClubLike = {
  id: "taekwondo-3",
  name: "Таеквондо",
  sessions: [{ weekday: 1, start_time: "14:50:00", end_time: "15:50:00" }],
};

// Шатар (3-р анги) нь 7 хоногт 2 УДАА хичээллэдэг
const chess3: ClubLike = {
  id: "chess-3",
  name: "Шатар",
  sessions: [
    { weekday: 1, start_time: "14:50:00", end_time: "15:50:00" },
    { weekday: 5, start_time: "15:30:00", end_time: "16:30:00" },
  ],
};

const art3: ClubLike = {
  id: "art-3",
  name: "ART урлал",
  sessions: [{ weekday: 4, start_time: "14:50:00", end_time: "15:50:00" }],
};

const englishClub: ClubLike = {
  id: "english",
  name: "English speaking club",
  sessions: [{ weekday: null, start_time: null, end_time: null }],
};

describe("цаг хөрвүүлэлт", () => {
  it("HH:MM:SS болон HH:MM хоёуланг уншина", () => {
    expect(timeToMinutes("14:50:00")).toBe(890);
    expect(timeToMinutes("14:50")).toBe(890);
    expect(timeToMinutes("09:05")).toBe(545);
  });

  it("буруу утганд null буцаана", () => {
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes("25:00")).toBeNull();
    expect(timeToMinutes("тодорхойгүй")).toBeNull();
  });

  it("харагдацад секундыг хасна", () => {
    expect(formatTime("16:15:00")).toBe("16:15");
  });
});

describe("хоёр цагийн давхцал", () => {
  it("ижил гараг, ижил цаг -> давхцана", () => {
    expect(
      sessionsOverlap(
        { weekday: 1, start_time: "14:50", end_time: "15:50" },
        { weekday: 1, start_time: "14:50", end_time: "15:50" },
      ),
    ).toBe(true);
  });

  it("ижил гараг, хэсэгчлэн давхцана", () => {
    expect(
      sessionsOverlap(
        { weekday: 3, start_time: "15:30", end_time: "16:30" },
        { weekday: 3, start_time: "15:40", end_time: "16:40" },
      ),
    ).toBe(true);
  });

  it("өөр гараг -> давхцахгүй", () => {
    expect(
      sessionsOverlap(
        { weekday: 1, start_time: "14:50", end_time: "15:50" },
        { weekday: 2, start_time: "14:50", end_time: "15:50" },
      ),
    ).toBe(false);
  });

  it("зэрэгцэн шүргэлцэх нь давхцал БИШ", () => {
    expect(
      sessionsOverlap(
        { weekday: 1, start_time: "14:00", end_time: "15:00" },
        { weekday: 1, start_time: "15:00", end_time: "16:00" },
      ),
    ).toBe(false);
  });

  it("цаг тодорхойгүй бол давхцал гэж үзэхгүй", () => {
    expect(
      sessionsOverlap(
        { weekday: null, start_time: null, end_time: null },
        { weekday: 1, start_time: "14:50", end_time: "15:50" },
      ),
    ).toBe(false);
  });
});

describe("сонгосон дугуйлангуудын давхцал", () => {
  it("даалгаварт заасан жишээг яг таарч илрүүлнэ", () => {
    const conflicts = findConflicts([taekwondo3, chess3]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].message).toBe(
      "Даваа 14:50 цагт Таеквондо болон Шатар давхцаж байна",
    );
  });

  it("давхцахгүй дугуйлангуудад анхааруулга гарахгүй", () => {
    expect(findConflicts([taekwondo3, art3])).toHaveLength(0);
  });

  it("цаг тодорхойгүй дугуйланг алгасана", () => {
    expect(findConflicts([taekwondo3, englishClub])).toHaveLength(0);
  });

  it("нэг дугуйлангийн БҮХ цагийг тооцно (7 хоногт 2 удаа)", () => {
    // Баасан 15:30–16:30 дээр Шатар(3)-тай давхцах дугуйлан
    const fridayClub: ClubLike = {
      id: "friday",
      name: "Таеквондо",
      sessions: [{ weekday: 5, start_time: "15:50:00", end_time: "16:50:00" }],
    };
    const conflicts = findConflicts([chess3, fridayClub]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].weekday).toBe(5);
    expect(conflicts[0].time).toBe("15:50");
  });

  it("нэг дугуйлан дангаараа давхцахгүй", () => {
    expect(findConflicts([chess3])).toHaveLength(0);
  });

  it("гурван дугуйлангийн бүх хосыг шалгана", () => {
    const a: ClubLike = {
      id: "a", name: "А",
      sessions: [{ weekday: 2, start_time: "15:30", end_time: "16:30" }],
    };
    const b: ClubLike = {
      id: "b", name: "Б",
      sessions: [{ weekday: 2, start_time: "16:00", end_time: "17:00" }],
    };
    const c: ClubLike = {
      id: "c", name: "В",
      sessions: [{ weekday: 2, start_time: "16:15", end_time: "17:15" }],
    };
    // А-Б, А-В, Б-В гурвуулаа давхцана
    expect(findConflicts([a, b, c])).toHaveLength(3);
  });
});
