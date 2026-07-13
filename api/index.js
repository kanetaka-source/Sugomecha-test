// server/index.ts
import express from "express";
import cors from "cors";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
function createPrismaClient() {
  if (process.env.ACCELERATE_URL) {
    return new PrismaClient({ datasourceUrl: process.env.ACCELERATE_URL }).$extends(withAccelerate());
  }
  return new PrismaClient();
}
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const calc = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return calc.length === expected.length && timingSafeEqual(calc, expected);
}
function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
function parseId(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
async function getEmployeeLocationId(employeeId) {
  if (employeeId == null) return null;
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { department: { select: { locationId: true } } }
  });
  return emp?.department?.locationId ?? null;
}
async function listNotificationsFor(employeeId, audience) {
  let where;
  if (audience === "admin") {
    where = { audience: "admin" };
  } else {
    const locationId = await getEmployeeLocationId(employeeId);
    const or = [{ scope: "all" }, { scope: "user", recipientId: employeeId }];
    if (locationId != null) or.push({ scope: "location", locationId });
    where = { audience: "home", OR: or };
  }
  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reads: { where: { employeeId }, select: { id: true } } }
  });
  return rows.filter((n) => n.excludeId == null || n.excludeId !== employeeId).map((n) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    link: n.link,
    actorName: n.actorName,
    createdAt: n.createdAt,
    read: n.reads.length > 0
  }));
}
async function notify(data) {
  try {
    if (data.dedupeKey) {
      const exists = await prisma.notification.findUnique({ where: { dedupeKey: data.dedupeKey } });
      if (exists) return null;
    }
    return await prisma.notification.create({
      data: {
        scope: data.scope ?? "user",
        recipientId: data.recipientId ?? null,
        locationId: data.locationId ?? null,
        excludeId: data.excludeId ?? null,
        audience: data.audience ?? "home",
        category: data.category,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
        actorName: data.actorName ?? null,
        dedupeKey: data.dedupeKey ?? null
      }
    });
  } catch (e) {
    console.error("notify failed", e);
    return null;
  }
}
async function notifyMaster(action, kind, name, adminLink) {
  const title = `${kind}\u300C${name}\u300D\u304C${action}\u3055\u308C\u307E\u3057\u305F`;
  await notify({ scope: "all", audience: "home", category: "master", title, link: "/dashboard" });
  await notify({ audience: "admin", category: "master", title, link: adminLink });
}
var app = express();
var PORT = 3001;
app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.get("/api/locations", async (_req, res) => {
  const locations = await prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { departments: { select: { _count: { select: { employees: true } } } } }
  });
  res.json(
    locations.map(({ departments, ...loc }) => ({
      ...loc,
      memberCount: departments.reduce((sum, d) => sum + d._count.employees, 0)
    }))
  );
});
app.post("/api/locations", async (req, res) => {
  const { name, note } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u62E0\u70B9\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.location.create({
      data: { name: String(name).trim(), note: note ? String(note).trim() : null }
    });
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, note } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u62E0\u70B9\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.location.update({
      where: { id },
      data: { name: String(name).trim(), note: note ? String(note).trim() : null }
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.location.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
function parseLocationId(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
app.get("/api/departments", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      location: { select: { id: true, name: true } },
      _count: { select: { employees: true } }
    }
  });
  res.json(departments.map(({ _count, ...d }) => ({ ...d, memberCount: _count.employees })));
});
app.post("/api/departments", async (req, res) => {
  const { name, note, locationId } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u90E8\u7F72\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.department.create({
      data: {
        name: String(name).trim(),
        note: note ? String(note).trim() : null,
        locationId: parseLocationId(locationId)
      },
      include: { location: { select: { id: true, name: true } } }
    });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") {
      return res.status(400).json({ error: "\u6307\u5B9A\u306E\u62E0\u70B9\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/departments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, note, locationId } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u90E8\u7F72\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: String(name).trim(),
        note: note ? String(note).trim() : null,
        locationId: parseLocationId(locationId)
      },
      include: { location: { select: { id: true, name: true } } }
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (e?.code === "P2003") {
      return res.status(400).json({ error: "\u6307\u5B9A\u306E\u62E0\u70B9\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/departments/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.department.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var ROLES = ["\u53D7\u8B1B\u8005", "\u8A55\u4FA1\u8005", "\u7BA1\u7406\u8005"];
var employeeInclude = {
  department: {
    select: { id: true, name: true, location: { select: { id: true, name: true } } }
  },
  enrolledCourses: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }
};
function parseCourseIds(body) {
  if (!Array.isArray(body?.enrolledCourseIds)) return [];
  return body.enrolledCourseIds.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}
function publicEmployee(e) {
  const { passwordHash, ...rest } = e;
  return rest;
}
app.get("/api/employees", async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: "asc" },
    include: employeeInclude
  });
  res.json(employees.map(publicEmployee));
});
app.get("/api/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  const emp = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
  if (!emp) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  res.json(publicEmployee(emp));
});
app.post("/api/employees", async (req, res) => {
  const { employeeNo, name, role, phone, birthDate, hireDate, assignedDate, password, departmentId } = req.body ?? {};
  if (!employeeNo || !String(employeeNo).trim()) {
    return res.status(400).json({ error: "\u793E\u54E1\u756A\u53F7\u306F\u5FC5\u9808\u3067\u3059" });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u6C0F\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.employee.create({
      data: {
        employeeNo: String(employeeNo).trim(),
        name: String(name).trim(),
        role: ROLES.includes(role) ? role : "\u53D7\u8B1B\u8005",
        phone: phone ? String(phone).trim() : null,
        birthDate: parseDate(birthDate),
        hireDate: parseDate(hireDate),
        assignedDate: parseDate(assignedDate),
        passwordHash: password ? hashPassword(String(password)) : null,
        departmentId: parseId(departmentId),
        enrolledCourses: { connect: parseCourseIds(req.body).map((id) => ({ id })) }
      },
      include: employeeInclude
    });
    res.status(201).json(publicEmployee(created));
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "\u305D\u306E\u793E\u54E1\u756A\u53F7\u306F\u65E2\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059" });
    }
    if (e?.code === "P2003") {
      return res.status(400).json({ error: "\u6307\u5B9A\u306E\u90E8\u7F72\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { employeeNo, name, role, phone, birthDate, hireDate, assignedDate, password, departmentId } = req.body ?? {};
  if (!employeeNo || !String(employeeNo).trim()) {
    return res.status(400).json({ error: "\u793E\u54E1\u756A\u53F7\u306F\u5FC5\u9808\u3067\u3059" });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u6C0F\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        employeeNo: String(employeeNo).trim(),
        name: String(name).trim(),
        role: ROLES.includes(role) ? role : void 0,
        phone: phone ? String(phone).trim() : null,
        birthDate: parseDate(birthDate),
        hireDate: parseDate(hireDate),
        assignedDate: parseDate(assignedDate),
        ...password ? { passwordHash: hashPassword(String(password)) } : {},
        departmentId: parseId(departmentId),
        enrolledCourses: { set: parseCourseIds(req.body).map((id2) => ({ id: id2 })) }
      },
      include: employeeInclude
    });
    res.json(publicEmployee(updated));
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "\u305D\u306E\u793E\u54E1\u756A\u53F7\u306F\u65E2\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059" });
    }
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    if (e?.code === "P2003") {
      return res.status(400).json({ error: "\u6307\u5B9A\u306E\u90E8\u7F72\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/employees/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.employee.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const employeeNo = String(req.body?.employeeNo ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!employeeNo || !password) {
    return res.status(400).json({ error: "\u793E\u54E1\u756A\u53F7\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  const emp = await prisma.employee.findUnique({ where: { employeeNo }, include: employeeInclude });
  if (!emp) {
    return res.status(401).json({ error: "\u793E\u54E1\u756A\u53F7\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3044\u307E\u3059" });
  }
  if (!emp.passwordHash) {
    return res.status(403).json({ error: "\u3053\u306E\u793E\u54E1\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u672A\u8A2D\u5B9A\u3067\u3059\u3002\u793E\u54E1\u30DE\u30B9\u30BF\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  if (!verifyPassword(password, emp.passwordHash)) {
    return res.status(401).json({ error: "\u793E\u54E1\u756A\u53F7\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3044\u307E\u3059" });
  }
  res.json(publicEmployee(emp));
});
app.get("/api/training-courses", async (_req, res) => {
  const courses = await prisma.trainingCourse.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { sections: true } } }
  });
  res.json(courses.map(({ _count, ...c }) => ({ ...c, sectionCount: _count.sections })));
});
var COURSE_ICONS = ["large", "small", "electrical", "body", "paint"];
var parseCourseIcon = (v) => COURSE_ICONS.includes(v) ? v : null;
app.post("/api/training-courses", async (req, res) => {
  const { name, note, icon } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u30B3\u30FC\u30B9\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.trainingCourse.create({
      data: { name: String(name).trim(), note: note ? String(note).trim() : null, icon: parseCourseIcon(icon) }
    });
    await notifyMaster("\u8FFD\u52A0", "\u7814\u4FEE\u30B3\u30FC\u30B9", created.name, "/admin/kenshu-course");
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/training-courses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, note, icon } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u30B3\u30FC\u30B9\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.trainingCourse.update({
      where: { id },
      data: { name: String(name).trim(), note: note ? String(note).trim() : null, icon: parseCourseIcon(icon) }
    });
    await notifyMaster("\u66F4\u65B0", "\u7814\u4FEE\u30B3\u30FC\u30B9", updated.name, "/admin/kenshu-course");
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/training-courses/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.trainingCourse.findUnique({ where: { id }, select: { name: true } });
    await prisma.trainingCourse.delete({ where: { id } });
    if (existing) await notifyMaster("\u524A\u9664", "\u7814\u4FEE\u30B3\u30FC\u30B9", existing.name, "/admin/kenshu-course");
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var sectionInclude = { course: { select: { id: true, name: true } } };
function buildSectionData(body) {
  const s = (v) => v == null || v === "" ? null : String(v).trim();
  const b = (v) => Boolean(v);
  const cnt = (v) => Math.max(0, Math.min(10, Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0));
  return {
    name: String(body.name).trim(),
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    courseId: parseId(body.courseId),
    header1Flag: b(body.header1Flag),
    header1Name: s(body.header1Name),
    header2Flag: b(body.header2Flag),
    header2Name: s(body.header2Name),
    header3Flag: b(body.header3Flag),
    header3Name: s(body.header3Name),
    header4Flag: b(body.header4Flag),
    header4Name: s(body.header4Name),
    header5Flag: b(body.header5Flag),
    header5Name: s(body.header5Name),
    selfEval1Flag: b(body.selfEval1Flag),
    selfEval1Type: s(body.selfEval1Type),
    selfEval1Name: s(body.selfEval1Name),
    selfEval1Count: cnt(body.selfEval1Count),
    selfEval2Flag: b(body.selfEval2Flag),
    selfEval2Type: s(body.selfEval2Type),
    selfEval2Name: s(body.selfEval2Name),
    selfEval2Count: cnt(body.selfEval2Count),
    adminEval1Flag: b(body.adminEval1Flag),
    adminEval1Type: s(body.adminEval1Type),
    adminEval1Name: s(body.adminEval1Name),
    adminEval1Count: cnt(body.adminEval1Count),
    adminEval2Flag: b(body.adminEval2Flag),
    adminEval2Type: s(body.adminEval2Type),
    adminEval2Name: s(body.adminEval2Name),
    adminEval2Count: cnt(body.adminEval2Count),
    adminEval3Flag: b(body.adminEval3Flag),
    adminEval3Type: s(body.adminEval3Type),
    adminEval3Name: s(body.adminEval3Name),
    adminEval3Count: cnt(body.adminEval3Count)
  };
}
app.get("/api/training-sections", async (_req, res) => {
  const sections = await prisma.trainingSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { ...sectionInclude, _count: { select: { items: true } } }
  });
  res.json(sections.map(({ _count, ...s }) => ({ ...s, itemCount: _count.items })));
});
app.get("/api/training-sections/:id", async (req, res) => {
  const id = Number(req.params.id);
  const section = await prisma.trainingSection.findUnique({
    where: { id },
    include: { ...sectionInclude, _count: { select: { items: true } } }
  });
  if (!section) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  const { _count, ...rest } = section;
  res.json({ ...rest, itemCount: _count.items });
});
app.post("/api/training-sections", async (req, res) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.trainingSection.create({
      data: buildSectionData(req.body),
      include: sectionInclude
    });
    await notifyMaster("\u8FFD\u52A0", "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3", created.name, "/admin/kenshu-section");
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u30B3\u30FC\u30B9\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/training-sections/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.trainingSection.update({
      where: { id },
      data: buildSectionData(req.body),
      include: sectionInclude
    });
    await notifyMaster("\u66F4\u65B0", "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3", updated.name, "/admin/kenshu-section");
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u30B3\u30FC\u30B9\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/training-sections/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.trainingSection.findUnique({ where: { id }, select: { name: true } });
    await prisma.trainingSection.delete({ where: { id } });
    if (existing) await notifyMaster("\u524A\u9664", "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3", existing.name, "/admin/kenshu-section");
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var itemInclude = {
  section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
  requiredQualifications: { select: { id: true, name: true, category: true } }
};
function parseQualIds(body) {
  if (!Array.isArray(body?.requiredQualificationIds)) return [];
  return body.requiredQualificationIds.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}
function buildItemData(body) {
  const s = (v) => v == null || v === "" ? null : String(v).trim();
  const b = (v) => Boolean(v);
  return {
    title: String(body.title).trim(),
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    sectionId: parseId(body.sectionId),
    flag1: b(body.flag1),
    value1: s(body.value1),
    flag2: b(body.flag2),
    value2: s(body.value2),
    flag3: b(body.flag3),
    value3: s(body.value3),
    flag4: b(body.flag4),
    value4: s(body.value4),
    flag5: b(body.flag5),
    value5: s(body.value5)
  };
}
app.get("/api/training-items", async (_req, res) => {
  const items = await prisma.trainingItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: itemInclude
  });
  res.json(items);
});
app.get("/api/training-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.trainingItem.findUnique({ where: { id }, include: itemInclude });
  if (!item) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  res.json(item);
});
app.post("/api/training-items", async (req, res) => {
  if (!req.body?.title || !String(req.body.title).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u9805\u76EE\u30BF\u30A4\u30C8\u30EB\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.trainingItem.create({
      data: {
        ...buildItemData(req.body),
        requiredQualifications: { connect: parseQualIds(req.body).map((id) => ({ id })) }
      },
      include: itemInclude
    });
    await notifyMaster("\u8FFD\u52A0", "\u7814\u4FEE\u9805\u76EE", created.title, "/admin/kenshu-item");
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/training-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!req.body?.title || !String(req.body.title).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u9805\u76EE\u30BF\u30A4\u30C8\u30EB\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.trainingItem.update({
      where: { id },
      data: {
        ...buildItemData(req.body),
        requiredQualifications: { set: parseQualIds(req.body).map((id2) => ({ id: id2 })) }
      },
      include: itemInclude
    });
    await notifyMaster("\u66F4\u65B0", "\u7814\u4FEE\u9805\u76EE", updated.title, "/admin/kenshu-item");
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/training-items/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.trainingItem.findUnique({ where: { id }, select: { title: true } });
    await prisma.trainingItem.delete({ where: { id } });
    if (existing) await notifyMaster("\u524A\u9664", "\u7814\u4FEE\u9805\u76EE", existing.title, "/admin/kenshu-item");
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var materialInclude = {
  item: {
    select: {
      id: true,
      title: true,
      section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } }
    }
  }
};
function buildMaterialData(body) {
  const s = (v) => v == null || v === "" ? null : String(v).trim();
  const b = (v) => Boolean(v);
  const data = {
    note: s(body.note),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    attachmentUrl: s(body.attachmentUrl),
    procedure: body.procedure ? JSON.stringify(body.procedure) : null,
    // 手順書(JSON)
    itemId: parseId(body.itemId)
  };
  for (let i = 1; i <= 8; i++) {
    data[`detail${i}Flag`] = b(body[`detail${i}Flag`]);
    data[`detail${i}Title`] = s(body[`detail${i}Title`]);
    data[`detail${i}Content`] = s(body[`detail${i}Content`]);
  }
  return data;
}
function publicMaterial(m) {
  let procedure = null;
  if (m.procedure) {
    try {
      procedure = JSON.parse(m.procedure);
    } catch {
      procedure = null;
    }
  }
  return { ...m, procedure };
}
app.get("/api/training-materials", async (_req, res) => {
  const materials = await prisma.trainingMaterial.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: materialInclude
  });
  res.json(materials.map(publicMaterial));
});
app.get("/api/training-materials/:id", async (req, res) => {
  const id = Number(req.params.id);
  const material = await prisma.trainingMaterial.findUnique({ where: { id }, include: materialInclude });
  if (!material) return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  res.json(publicMaterial(material));
});
app.post("/api/training-materials", async (req, res) => {
  if (!req.body?.detail1Title || !String(req.body.detail1Title).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u8A73\u7D30\u30BF\u30A4\u30C8\u30EB1\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.trainingMaterial.create({ data: buildMaterialData(req.body), include: materialInclude });
    await notifyMaster("\u8FFD\u52A0", "\u7814\u4FEE\u6559\u6750", created.detail1Title ?? "\u6559\u6750", "/admin/kenshu-material");
    res.status(201).json(publicMaterial(created));
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u9805\u76EE\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/training-materials/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!req.body?.detail1Title || !String(req.body.detail1Title).trim()) {
    return res.status(400).json({ error: "\u7814\u4FEE\u8A73\u7D30\u30BF\u30A4\u30C8\u30EB1\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.trainingMaterial.update({ where: { id }, data: buildMaterialData(req.body), include: materialInclude });
    await notifyMaster("\u66F4\u65B0", "\u7814\u4FEE\u6559\u6750", updated.detail1Title ?? "\u6559\u6750", "/admin/kenshu-material");
    res.json(publicMaterial(updated));
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u9805\u76EE\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/training-materials/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.trainingMaterial.findUnique({ where: { id }, select: { detail1Title: true } });
    await prisma.trainingMaterial.delete({ where: { id } });
    if (existing) await notifyMaster("\u524A\u9664", "\u7814\u4FEE\u6559\u6750", existing.detail1Title ?? "\u6559\u6750", "/admin/kenshu-material");
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var QUAL_CATEGORIES = ["\u56FD\u5BB6\u8CC7\u683C", "\u6C11\u9593\u8CC7\u683C", "\u793E\u5185\u8CC7\u683C"];
function buildQualificationData(body) {
  const category = QUAL_CATEGORIES.includes(body?.category) ? body.category : null;
  return {
    name: String(body.name).trim(),
    category
  };
}
app.get("/api/qualifications", async (_req, res) => {
  const qualifications = await prisma.qualification.findMany({ orderBy: { id: "asc" } });
  res.json(qualifications);
});
app.post("/api/qualifications", async (req, res) => {
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: "\u8CC7\u683C\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.qualification.create({ data: buildQualificationData(req.body) });
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/qualifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!req.body?.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: "\u8CC7\u683C\u540D\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.qualification.update({ where: { id }, data: buildQualificationData(req.body) });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/qualifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.qualification.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/permissions", async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: "asc" },
    include: {
      department: { select: { name: true, location: { select: { name: true } } } },
      permission: true
    }
  });
  res.json(
    employees.map((e) => {
      let grantedCount = 0;
      if (e.permission?.granted) {
        try {
          grantedCount = JSON.parse(e.permission.granted).length;
        } catch {
          grantedCount = 0;
        }
      }
      return {
        employeeId: e.id,
        employeeNo: e.employeeNo,
        name: e.name,
        role: e.role,
        departmentName: e.department?.name ?? null,
        locationName: e.department?.location?.name ?? null,
        grantedCount
      };
    })
  );
});
app.get("/api/permissions/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: { select: { name: true } }, permission: true }
  });
  if (!emp) return res.status(404).json({ error: "\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  let granted = [];
  if (emp.permission?.granted) {
    try {
      granted = JSON.parse(emp.permission.granted);
    } catch {
      granted = [];
    }
  }
  res.json({
    employeeId: emp.id,
    employeeNo: emp.employeeNo,
    name: emp.name,
    role: emp.role,
    departmentName: emp.department?.name ?? null,
    granted
  });
});
app.put("/api/permissions/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const granted = Array.isArray(req.body?.granted) ? req.body.granted.filter((x) => typeof x === "string") : [];
  const grantedJson = JSON.stringify(granted);
  try {
    await prisma.permission.upsert({
      where: { employeeId },
      create: { employeeId, granted: grantedJson },
      update: { granted: grantedJson }
    });
    res.json({ employeeId, granted });
  } catch (e) {
    if (e?.code === "P2003") return res.status(404).json({ error: "\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/held-qualifications", async (_req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { id: "asc" },
    include: {
      department: { select: { name: true } },
      _count: { select: { heldQualifications: true } }
    }
  });
  res.json(
    employees.map((e) => ({
      employeeId: e.id,
      employeeNo: e.employeeNo,
      name: e.name,
      role: e.role,
      departmentName: e.department?.name ?? null,
      heldCount: e._count.heldQualifications
    }))
  );
});
app.get("/api/held-qualifications/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: { select: { name: true } },
      heldQualifications: { include: { qualification: true }, orderBy: { id: "asc" } }
    }
  });
  if (!emp) return res.status(404).json({ error: "\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  res.json({
    employeeId: emp.id,
    employeeNo: emp.employeeNo,
    name: emp.name,
    role: emp.role,
    departmentName: emp.department?.name ?? null,
    held: emp.heldQualifications.map((h) => ({
      qualificationId: h.qualificationId,
      name: h.qualification.name,
      category: h.qualification.category,
      acquiredDate: h.acquiredDate,
      validUntil: h.validUntil
    }))
  });
});
app.post("/api/held-qualifications/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const qualificationId = parseId(req.body?.qualificationId);
  if (qualificationId == null) {
    return res.status(400).json({ error: "\u8CC7\u683C\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044" });
  }
  try {
    await prisma.heldQualification.create({
      data: {
        employeeId,
        qualificationId,
        acquiredDate: parseDate(req.body?.acquiredDate),
        validUntil: parseDate(req.body?.validUntil)
      }
    });
    const q = await prisma.qualification.findUnique({ where: { id: qualificationId }, select: { name: true } });
    await notify({ scope: "user", recipientId: employeeId, category: "qual", title: `\u8CC7\u683C\u300C${q?.name ?? "\u8CC7\u683C"}\u300D\u304C\u8FFD\u52A0\u3055\u308C\u307E\u3057\u305F`, link: "/shikaku" });
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e?.code === "P2002") return res.status(409).json({ error: "\u305D\u306E\u8CC7\u683C\u306F\u65E2\u306B\u4FDD\u6709\u3057\u3066\u3044\u307E\u3059" });
    if (e?.code === "P2003") return res.status(400).json({ error: "\u30E6\u30FC\u30B6\u30FC\u307E\u305F\u306F\u8CC7\u683C\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/held-qualifications/:employeeId/:qualificationId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const qualificationId = Number(req.params.qualificationId);
  try {
    await prisma.heldQualification.update({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
      data: {
        acquiredDate: parseDate(req.body?.acquiredDate),
        validUntil: parseDate(req.body?.validUntil)
      }
    });
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/held-qualifications/:employeeId/:qualificationId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);
  const qualificationId = Number(req.params.qualificationId);
  try {
    await prisma.heldQualification.delete({
      where: { employeeId_qualificationId: { employeeId, qualificationId } }
    });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var examSectionInclude = { course: { select: { id: true, name: true } } };
app.get("/api/exam-sections", async (_req, res) => {
  const sections = await prisma.trainingSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { ...examSectionInclude, _count: { select: { examQuestions: true } } }
  });
  res.json(
    sections.map(({ _count, ...s }) => ({
      id: s.id,
      name: s.name,
      courseId: s.courseId,
      course: s.course,
      examPassLine: s.examPassLine,
      questionCount: _count.examQuestions
    }))
  );
});
app.get("/api/exam-sections/:sectionId", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  const section = await prisma.trainingSection.findUnique({
    where: { id: sectionId },
    include: {
      ...examSectionInclude,
      examQuestions: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }
    }
  });
  if (!section) return res.status(404).json({ error: "\u5BFE\u8C61\u306E\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
  res.json({
    id: section.id,
    name: section.name,
    courseId: section.courseId,
    course: section.course,
    examPassLine: section.examPassLine,
    questions: section.examQuestions
  });
});
app.put("/api/exam-sections/:sectionId", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  let passLine = null;
  const raw = req.body?.examPassLine;
  if (raw !== null && raw !== void 0 && raw !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return res.status(400).json({ error: "\u5408\u683C\u30E9\u30A4\u30F3\u306F0\u301C100\u306E\u6570\u5024\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    passLine = Math.round(n);
  }
  try {
    const updated = await prisma.trainingSection.update({
      where: { id: sectionId },
      data: { examPassLine: passLine }
    });
    res.json({ id: updated.id, examPassLine: updated.examPassLine });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u306E\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
function buildExamQuestionData(body) {
  return {
    content: String(body?.content ?? "").trim(),
    answer: Boolean(body?.answer),
    explanation: body?.explanation && String(body.explanation).trim() ? String(body.explanation).trim() : null,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0
  };
}
app.post("/api/exam-sections/:sectionId/questions", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  if (!req.body?.content || !String(req.body.content).trim()) {
    return res.status(400).json({ error: "\u8A2D\u554F\u5185\u5BB9\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const created = await prisma.examQuestion.create({
      data: { ...buildExamQuestionData(req.body), sectionId }
    });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u6307\u5B9A\u306E\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/exam-questions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!req.body?.content || !String(req.body.content).trim()) {
    return res.status(400).json({ error: "\u8A2D\u554F\u5185\u5BB9\u306F\u5FC5\u9808\u3067\u3059" });
  }
  try {
    const updated = await prisma.examQuestion.update({
      where: { id },
      data: buildExamQuestionData(req.body)
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/exam-sections/:sectionId/questions/order", async (req, res) => {
  const sectionId = Number(req.params.sectionId);
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];
  try {
    await prisma.$transaction(
      orderedIds.map(
        (id, idx) => prisma.examQuestion.updateMany({ where: { id, sectionId }, data: { sortOrder: idx } })
      )
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "\u4E26\u3073\u9806\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/exam-questions/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.examQuestion.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var EXAM_RESULTS = ["\u5408\u683C", "\u4E0D\u5408\u683C"];
var applicationInclude = {
  section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
  applicant: {
    select: { id: true, employeeNo: true, name: true, department: { select: { id: true, name: true } } }
  }
};
app.get("/api/exam-applications", async (req, res) => {
  const where = {};
  if (req.query.status === "\u7533\u8ACB\u4E2D" || req.query.status === "\u627F\u8A8D\u6E08") where.status = req.query.status;
  const applicantId = parseId(req.query.applicantId);
  if (applicantId != null) where.applicantId = applicantId;
  const sectionId = parseId(req.query.sectionId);
  if (sectionId != null) where.sectionId = sectionId;
  const apps = await prisma.examApplication.findMany({
    where,
    orderBy: { appliedAt: "desc" },
    include: applicationInclude
  });
  res.json(apps);
});
app.post("/api/exam-applications", async (req, res) => {
  const sectionId = parseId(req.body?.sectionId);
  const applicantId = parseId(req.body?.applicantId);
  if (sectionId == null) return res.status(400).json({ error: "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
  if (applicantId == null) return res.status(400).json({ error: "\u7533\u8ACB\u8005\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" });
  try {
    const created = await prisma.examApplication.create({
      data: { sectionId, applicantId, status: "\u7533\u8ACB\u4E2D" },
      include: applicationInclude
    });
    const secName = created.section?.name ?? "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3";
    const appName = created.applicant?.name ?? "\u793E\u54E1";
    await notify({ scope: "user", recipientId: applicantId, category: "exam", title: `\u7B46\u8A18\u8A66\u9A13\u3092\u7533\u8ACB\u3057\u307E\u3057\u305F\uFF08${secName}\uFF09`, link: "/jiko-hyoka" });
    await notify({ audience: "admin", category: "exam", title: `${appName}\u3055\u3093\u304C\u7B46\u8A18\u8A66\u9A13\u3092\u7533\u8ACB\u3057\u307E\u3057\u305F\uFF08${secName}\uFF09`, link: "/admin/hikki-shinsei" });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u30BB\u30AF\u30B7\u30E7\u30F3\u307E\u305F\u306F\u7533\u8ACB\u8005\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u7533\u8ACB\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/exam-applications/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.examApplication.update({
      where: { id },
      data: { status: "\u627F\u8A8D\u6E08", approvedAt: /* @__PURE__ */ new Date() },
      include: applicationInclude
    });
    const secName = updated.section?.name ?? "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3";
    const appName = updated.applicant?.name ?? "\u793E\u54E1";
    if (updated.applicantId != null) {
      await notify({ scope: "user", recipientId: updated.applicantId, category: "exam", title: `\u7B46\u8A18\u8A66\u9A13\u306E\u7533\u8ACB\u304C\u627F\u8A8D\u3055\u308C\u307E\u3057\u305F\uFF08${secName}\uFF09`, link: "/jiko-hyoka" });
    }
    await notify({ audience: "admin", category: "exam", title: `${appName}\u3055\u3093\u306E\u7B46\u8A18\u8A66\u9A13\u3092\u627F\u8A8D\u3057\u307E\u3057\u305F\uFF08${secName}\uFF09`, link: "/admin/hikki-shinsei" });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u627F\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.put("/api/exam-applications/:id/result", async (req, res) => {
  const id = Number(req.params.id);
  const raw = req.body?.result;
  const result = EXAM_RESULTS.includes(raw) ? raw : null;
  try {
    const updated = await prisma.examApplication.update({
      where: { id },
      data: { result },
      include: applicationInclude
    });
    if (updated.applicantId != null && result) {
      const secName = updated.section?.name ?? "\u7814\u4FEE\u30BB\u30AF\u30B7\u30E7\u30F3";
      const appName = updated.applicant?.name ?? "\u793E\u54E1";
      await notify({ scope: "user", recipientId: updated.applicantId, category: "exam", title: `\u7B46\u8A18\u8A66\u9A13\u306E\u7D50\u679C\u304C\u51FA\u307E\u3057\u305F\uFF1A${result}\uFF08${secName}\uFF09`, link: "/jiko-hyoka" });
      if (result === "\u5408\u683C") {
        const locationId = await getEmployeeLocationId(updated.applicantId);
        if (locationId != null) {
          await notify({ scope: "location", locationId, excludeId: updated.applicantId, category: "exam", title: `${appName}\u3055\u3093\u304C\u7B46\u8A18\u8A66\u9A13\uFF08${secName}\uFF09\u306B\u5408\u683C\u3057\u307E\u3057\u305F`, link: `/shinchoku?employeeId=${updated.applicantId}` });
        }
      }
    }
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.delete("/api/exam-applications/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.examApplication.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/eval-stamps", async (req, res) => {
  const employeeId = parseId(req.query.employeeId);
  const stamps = await prisma.evalStamp.findMany({
    where: employeeId != null ? { employeeId } : void 0,
    select: { employeeId: true, itemId: true, kind: true, idx: true, count: true }
  });
  res.json(stamps);
});
app.put("/api/eval-stamps", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const itemId = parseId(req.body?.itemId);
  const kind = req.body?.kind === "admin" ? "admin" : req.body?.kind === "self" ? "self" : null;
  const idx = parseId(req.body?.idx);
  const hasCount = typeof req.body?.count === "number";
  const count = hasCount ? Math.max(0, Math.min(10, Math.trunc(req.body.count))) : 0;
  const value = hasCount ? count > 0 : Boolean(req.body?.value);
  const actorName = typeof req.body?.actorName === "string" ? req.body.actorName : null;
  if (employeeId == null || itemId == null || kind == null || idx == null) {
    return res.status(400).json({ error: "employeeId / itemId / kind / idx \u304C\u5FC5\u8981\u3067\u3059" });
  }
  try {
    if (value) {
      await prisma.evalStamp.upsert({
        where: { employeeId_itemId_kind_idx: { employeeId, itemId, kind, idx } },
        create: { employeeId, itemId, kind, idx, count },
        update: { count }
      });
    } else {
      await prisma.evalStamp.deleteMany({ where: { employeeId, itemId, kind, idx } });
    }
    if (kind === "admin" && value) {
      let notifyPass = !hasCount;
      if (hasCount) {
        const it = await prisma.trainingItem.findUnique({
          where: { id: itemId },
          select: { section: { select: { adminEval1Count: true, adminEval2Count: true, adminEval3Count: true } } }
        });
        const target = it?.section ? Number(it.section[`adminEval${idx}Count`] ?? 0) : 0;
        notifyPass = target > 0 && count >= target;
      }
      if (notifyPass) {
        const [item, subject] = await Promise.all([
          prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } }),
          prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } })
        ]);
        const itemTitle = item?.title ?? "\u7814\u4FEE\u9805\u76EE";
        await notify({ scope: "user", recipientId: employeeId, category: "eval", title: `\u300C${itemTitle}\u300D\u304C\u8A55\u4FA1\u3055\u308C\u307E\u3057\u305F\uFF1A\u5408\u683C`, link: "/jiko-hyoka", actorName });
        const locationId = await getEmployeeLocationId(employeeId);
        if (locationId != null) {
          await notify({ scope: "location", locationId, excludeId: employeeId, category: "eval", title: `${subject?.name ?? "\u793E\u54E1"}\u3055\u3093\u304C\u300C${itemTitle}\u300D\u306B\u5408\u683C\u3057\u307E\u3057\u305F`, link: `/shinchoku?employeeId=${employeeId}`, actorName });
        }
      }
    }
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u793E\u54E1\u307E\u305F\u306F\u7814\u4FEE\u9805\u76EE\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/procedure-grades", async (req, res) => {
  const employeeId = parseId(req.query.employeeId);
  const itemId = parseId(req.query.itemId);
  const idx = parseId(req.query.idx);
  if (employeeId == null || itemId == null || idx == null) {
    return res.status(400).json({ error: "employeeId / itemId / idx \u304C\u5FC5\u8981\u3067\u3059" });
  }
  const [grades, evalRow] = await Promise.all([
    prisma.procedureGrade.findMany({
      where: { employeeId, itemId, idx },
      select: { stepIndex: true, pointIndex: true, pass: true },
      orderBy: [{ stepIndex: "asc" }, { pointIndex: "asc" }]
    }),
    prisma.procedureEval.findUnique({
      where: { employeeId_itemId_idx: { employeeId, itemId, idx } },
      select: { result: true, comment: true, gradedByName: true, updatedAt: true }
    })
  ]);
  res.json({
    grades,
    result: evalRow?.result ?? null,
    comment: evalRow?.comment ?? "",
    gradedByName: evalRow?.gradedByName ?? null,
    gradedAt: evalRow?.updatedAt ?? null
  });
});
app.get("/api/procedure-evals", async (req, res) => {
  const employeeId = parseId(req.query.employeeId);
  if (employeeId == null) return res.status(400).json({ error: "employeeId \u304C\u5FC5\u8981\u3067\u3059" });
  const evals = await prisma.procedureEval.findMany({
    where: { employeeId },
    select: { itemId: true, idx: true, result: true, comment: true, gradedByName: true, updatedAt: true }
  });
  res.json(evals.map(({ updatedAt, ...e }) => ({ ...e, gradedAt: updatedAt })));
});
app.put("/api/procedure-grades", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const itemId = parseId(req.body?.itemId);
  const idx = parseId(req.body?.idx);
  const grades = Array.isArray(req.body?.grades) ? req.body.grades : null;
  const result = req.body?.result === "pass" ? "pass" : req.body?.result === "fail" ? "fail" : null;
  const comment = typeof req.body?.comment === "string" ? req.body.comment : "";
  const gradedById = parseId(req.body?.gradedById);
  const gradedByName = typeof req.body?.gradedByName === "string" ? req.body.gradedByName : null;
  if (employeeId == null || itemId == null || idx == null || grades == null || result == null) {
    return res.status(400).json({ error: "employeeId / itemId / idx / grades / result \u304C\u5FC5\u8981\u3067\u3059" });
  }
  try {
    await prisma.$transaction([
      prisma.procedureGrade.deleteMany({ where: { employeeId, itemId, idx } }),
      ...grades.map((g) => ({
        stepIndex: parseId(g?.stepIndex),
        pointIndex: parseId(g?.pointIndex),
        pass: Boolean(g?.pass)
      })).filter((g) => g.stepIndex != null && g.pointIndex != null).map(
        (g) => prisma.procedureGrade.create({
          data: { employeeId, itemId, idx, stepIndex: g.stepIndex, pointIndex: g.pointIndex, pass: g.pass }
        })
      ),
      prisma.procedureEval.upsert({
        where: { employeeId_itemId_idx: { employeeId, itemId, idx } },
        create: { employeeId, itemId, idx, result, comment, gradedById, gradedByName },
        update: { result, comment, gradedById, gradedByName }
      })
    ]);
    const [item, subject] = await Promise.all([
      prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } }),
      prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } })
    ]);
    const itemTitle = item?.title ?? "\u7814\u4FEE\u9805\u76EE";
    const resultJp = result === "pass" ? "\u5408\u683C" : "\u4E0D\u5408\u683C";
    await notify({ scope: "user", recipientId: employeeId, category: "eval", title: `\u300C${itemTitle}\u300D\u304C\u8A55\u4FA1\u3055\u308C\u307E\u3057\u305F\uFF1A${resultJp}`, link: "/jiko-hyoka", actorName: gradedByName });
    if (result === "pass") {
      const locationId = await getEmployeeLocationId(employeeId);
      if (locationId != null) {
        await notify({ scope: "location", locationId, excludeId: employeeId, category: "eval", title: `${subject?.name ?? "\u793E\u54E1"}\u3055\u3093\u304C\u300C${itemTitle}\u300D\u306B\u5408\u683C\u3057\u307E\u3057\u305F`, link: `/shinchoku?employeeId=${employeeId}`, actorName: gradedByName });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u793E\u54E1\u307E\u305F\u306F\u7814\u4FEE\u9805\u76EE\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/waiting-orders", async (req, res) => {
  const itemId = parseId(req.query.itemId);
  const orders = await prisma.waitingOrder.findMany({
    where: itemId != null ? { itemId } : void 0,
    select: { itemId: true, employeeId: true, position: true },
    orderBy: [{ itemId: "asc" }, { position: "asc" }]
  });
  res.json(orders);
});
app.put("/api/waiting-orders", async (req, res) => {
  const itemId = parseId(req.body?.itemId);
  const ids = Array.isArray(req.body?.employeeIds) ? req.body.employeeIds : null;
  if (itemId == null || ids == null) {
    return res.status(400).json({ error: "itemId / employeeIds \u304C\u5FC5\u8981\u3067\u3059" });
  }
  const employeeIds = ids.map((v) => parseId(v)).filter((v) => v != null);
  try {
    await prisma.$transaction([
      prisma.waitingOrder.deleteMany({ where: { itemId } }),
      ...employeeIds.map(
        (employeeId, position) => prisma.waitingOrder.create({ data: { itemId, employeeId, position } })
      )
    ]);
    const wItem = await prisma.trainingItem.findUnique({ where: { id: itemId }, select: { title: true } });
    const wTitle = wItem?.title ?? "\u7814\u4FEE\u9805\u76EE";
    for (let p = 0; p < employeeIds.length; p++) {
      const title = p === 0 ? `\u4F5C\u696D\u5F85\u3061\u304C1\u4F4D\u306B\u306A\u308A\u307E\u3057\u305F\uFF08${wTitle}\uFF09` : `\u4F5C\u696D\u5F85\u3061\u306E\u9806\u756A\u304C\u5909\u66F4\u3055\u308C\u307E\u3057\u305F\uFF08${wTitle}\uFF09`;
      await notify({ scope: "user", recipientId: employeeIds[p], category: "waiting", title, link: `/machi/${itemId}` });
    }
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2003") return res.status(400).json({ error: "\u793E\u54E1\u307E\u305F\u306F\u7814\u4FEE\u9805\u76EE\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" });
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/notifications", async (req, res) => {
  const employeeId = parseId(req.query.employeeId);
  const audience = req.query.audience === "admin" ? "admin" : "home";
  if (employeeId == null) return res.status(400).json({ error: "employeeId \u304C\u5FC5\u8981\u3067\u3059" });
  try {
    const list = await listNotificationsFor(employeeId, audience);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/notifications/read", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const notificationId = parseId(req.body?.id);
  if (employeeId == null || notificationId == null) {
    return res.status(400).json({ error: "employeeId / id \u304C\u5FC5\u8981\u3067\u3059" });
  }
  try {
    await prisma.notificationRead.upsert({
      where: { notificationId_employeeId: { notificationId, employeeId } },
      create: { notificationId, employeeId },
      update: {}
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.post("/api/notifications/read-all", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (employeeId == null) return res.status(400).json({ error: "employeeId \u304C\u5FC5\u8981\u3067\u3059" });
  const notificationIds = ids.map((v) => parseId(v)).filter((v) => v != null);
  try {
    await prisma.notificationRead.createMany({
      data: notificationIds.map((notificationId) => ({ notificationId, employeeId })),
      skipDuplicates: true
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var TIER_JP = { gold: "\u30B4\u30FC\u30EB\u30C9", silver: "\u30B7\u30EB\u30D0\u30FC", bronze: "\u30D6\u30ED\u30F3\u30BA" };
app.post("/api/notifications/badge", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const label = typeof req.body?.label === "string" ? req.body.label : null;
  const tier = typeof req.body?.tier === "string" ? req.body.tier : null;
  if (employeeId == null || !label || !tier) {
    return res.status(400).json({ error: "employeeId / label / tier \u304C\u5FC5\u8981\u3067\u3059" });
  }
  const tierJp = TIER_JP[tier] ?? tier;
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } });
  const name = emp?.name ?? "\u793E\u54E1";
  const locationId = await getEmployeeLocationId(employeeId);
  await notify({
    scope: "user",
    recipientId: employeeId,
    category: "badge",
    title: `${label} \u30D0\u30C3\u30B8\uFF08${tierJp}\uFF09\u3092\u7372\u5F97\u3057\u307E\u3057\u305F`,
    link: "/dashboard",
    dedupeKey: `badge-self-${employeeId}-${label}-${tier}`
  });
  if (locationId != null) {
    await notify({
      scope: "location",
      locationId,
      excludeId: employeeId,
      category: "badge",
      title: `${name}\u3055\u3093\u304C ${label} \u30D0\u30C3\u30B8\uFF08${tierJp}\uFF09\u3092\u7372\u5F97\u3057\u307E\u3057\u305F`,
      link: "/dashboard",
      dedupeKey: `badge-loc-${employeeId}-${label}-${tier}`
    });
  }
  res.json({ ok: true });
});
app.post("/api/notifications/qual", async (req, res) => {
  const employeeId = parseId(req.body?.employeeId);
  const qualificationId = parseId(req.body?.qualificationId);
  const kind = req.body?.kind;
  const qualName = typeof req.body?.qualName === "string" ? req.body.qualName : "\u8CC7\u683C";
  const validUntil = typeof req.body?.validUntil === "string" ? req.body.validUntil : "";
  if (employeeId == null || !["added", "expired", "expiring"].includes(kind)) {
    return res.status(400).json({ error: "employeeId / kind \u304C\u5FC5\u8981\u3067\u3059" });
  }
  const title = kind === "added" ? `\u8CC7\u683C\u300C${qualName}\u300D\u304C\u8FFD\u52A0\u3055\u308C\u307E\u3057\u305F` : kind === "expired" ? `\u8CC7\u683C\u300C${qualName}\u300D\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u3066\u3044\u307E\u3059` : `\u8CC7\u683C\u300C${qualName}\u300D\u306E\u6709\u52B9\u671F\u9650\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059`;
  await notify({
    scope: "user",
    recipientId: employeeId,
    category: "qual",
    title,
    link: "/shikaku",
    dedupeKey: `qual-${kind}-${employeeId}-${qualificationId ?? ""}-${validUntil}`
  });
  res.json({ ok: true });
});
app.get("/api/score-updates", async (_req, res) => {
  try {
    const [stamps, evals] = await Promise.all([
      prisma.evalStamp.groupBy({ by: ["employeeId"], _max: { createdAt: true } }),
      prisma.procedureEval.groupBy({ by: ["employeeId"], _max: { updatedAt: true } })
    ]);
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) if (s._max.createdAt) m.set(s.employeeId, s._max.createdAt);
    for (const e of evals) {
      const cur = m.get(e.employeeId);
      if (e._max.updatedAt && (!cur || e._max.updatedAt > cur)) m.set(e.employeeId, e._max.updatedAt);
    }
    res.json([...m.entries()].map(([employeeId, lastUpdatedAt]) => ({ employeeId, lastUpdatedAt })));
  } catch {
    res.status(500).json({ error: "\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
app.get("/api/dashboard-bootstrap", async (req, res) => {
  const employeeId = parseId(req.query.employeeId);
  try {
    const [coursesRaw, sectionsRaw, items, stamps, employee, notifications] = await Promise.all([
      prisma.trainingCourse.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { _count: { select: { sections: true } } }
      }),
      prisma.trainingSection.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { ...sectionInclude, _count: { select: { items: true } } }
      }),
      prisma.trainingItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: itemInclude
      }),
      employeeId != null ? prisma.evalStamp.findMany({
        where: { employeeId },
        select: { employeeId: true, itemId: true, kind: true, idx: true, count: true }
      }) : Promise.resolve([]),
      employeeId != null ? prisma.employee.findUnique({ where: { id: employeeId }, include: employeeInclude }).catch(() => null) : Promise.resolve(null),
      employeeId != null ? listNotificationsFor(employeeId, "home") : Promise.resolve([])
    ]);
    res.json({
      courses: coursesRaw.map(({ _count, ...c }) => ({ ...c, sectionCount: _count.sections })),
      sections: sectionsRaw.map(({ _count, ...s }) => ({ ...s, itemCount: _count.items })),
      items,
      stamps,
      employee: employee ? publicEmployee(employee) : null,
      notifications
    });
  } catch {
    res.status(500).json({ error: "\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API \u30B5\u30FC\u30D0\u30FC\u8D77\u52D5: http://localhost:${PORT}`);
  });
}
var index_default = app;
export {
  index_default as default
};
