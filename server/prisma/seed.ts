// サンプルデータ投入: npm run db:seed
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'

const prisma = new PrismaClient()

// server/index.ts の hashPassword と同じロジック（salt:hash 形式）
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const locations = [
  { name: '本社', note: '管理部門' },
  { name: '泉大津工場', note: '' },
  { name: '堺サービスセンター', note: '' },
  { name: '和歌山営業所', note: '' },
]

const departments = [
  { name: '整備部', note: '車両整備' },
  { name: '営業部', note: '' },
  { name: '品質管理部', note: '' },
  { name: '総務部', note: '' },
]

async function main() {
  // 拠点マスタ（既にデータがあれば投入しない）
  const locCount = await prisma.location.count()
  if (locCount > 0) {
    console.log(`拠点マスタ: 既に${locCount}件あるため投入をスキップ`)
  } else {
    for (const [i, loc] of locations.entries()) {
      await prisma.location.create({ data: { name: loc.name, note: loc.note || null, sortOrder: i } })
    }
    console.log(`拠点マスタ: ${locations.length}件を投入しました`)
  }

  // 部門マスタ
  const depCount = await prisma.department.count()
  if (depCount > 0) {
    console.log(`部門マスタ: 既に${depCount}件あるため投入をスキップ`)
  } else {
    for (const [i, dep] of departments.entries()) {
      await prisma.department.create({ data: { name: dep.name, note: dep.note || null, sortOrder: i } })
    }
    console.log(`部門マスタ: ${departments.length}件を投入しました`)
  }

  // 研修コースマスタ
  const courseCount = await prisma.trainingCourse.count()
  if (courseCount > 0) {
    console.log(`研修コースマスタ: 既に${courseCount}件あるため投入をスキップ`)
  } else {
    const courses = [
      { name: '大型研修', note: '大型車両の整備研修' },
      { name: '小型研修', note: '' },
      { name: '電装研修', note: '' },
      { name: '車体研修', note: '' },
      { name: '塗装研修', note: '' },
    ]
    for (const [i, c] of courses.entries()) {
      await prisma.trainingCourse.create({ data: { name: c.name, note: c.note || null, sortOrder: i } })
    }
    console.log(`研修コースマスタ: ${courses.length}件を投入しました`)
  }

  // 研修セクションマスタ（大型研修に紐づけ。自己評価テーブルの列構成のサンプル）
  const sectionCount = await prisma.trainingSection.count()
  if (sectionCount > 0) {
    console.log(`研修セクションマスタ: 既に${sectionCount}件あるため投入をスキップ`)
  } else {
    const oogata = await prisma.trainingCourse.findFirst({ where: { name: '大型研修' } })
    await prisma.trainingSection.create({
      data: {
        name: 'STEP1 基本整備',
        courseId: oogata?.id ?? null,
        sortOrder: 0,
        note: '大型研修の最初のセクション',
        header1Flag: true, header1Name: '優先',
        header2Flag: true, header2Name: '工程',
        header3Flag: true, header3Name: '内容',
        selfEval1Flag: true, selfEval1Type: '印', selfEval1Name: '自己評価',
        adminEval1Flag: true, adminEval1Type: '印', adminEval1Name: '評価者評価',
      },
    })
    console.log('研修セクションマスタ: 1件を投入しました')
  }

  // 研修項目マスタ（STEP1 基本整備 に紐づく行データ。列＝優先/工程/内容）
  const itemCount = await prisma.trainingItem.count()
  if (itemCount > 0) {
    console.log(`研修項目マスタ: 既に${itemCount}件あるため投入をスキップ`)
  } else {
    const step1 = await prisma.trainingSection.findFirst({ where: { name: 'STEP1 基本整備' } })
    if (step1) {
      const items = [
        { title: 'ブーツ取替確認', value1: '高', value2: 'ミッション', value3: 'ブーツ及び/本体取替　作業確認' },
        { title: 'オイル交換確認', value1: '中', value2: 'ミッション', value3: 'オイル交換　作業確認' },
      ]
      for (const [i, it] of items.entries()) {
        await prisma.trainingItem.create({
          data: {
            title: it.title,
            sectionId: step1.id,
            sortOrder: i,
            flag1: true, value1: it.value1,
            flag2: true, value2: it.value2,
            flag3: true, value3: it.value3,
          },
        })
      }
      console.log(`研修項目マスタ: ${items.length}件を投入しました`)
    }
  }

  // 研修教材マスタ（ブーツ取替確認 の項目に紐づく教材）
  const materialCount = await prisma.trainingMaterial.count()
  if (materialCount > 0) {
    console.log(`研修教材マスタ: 既に${materialCount}件あるため投入をスキップ`)
  } else {
    const item = await prisma.trainingItem.findFirst({ where: { title: 'ブーツ取替確認' } })
    if (item) {
      await prisma.trainingMaterial.create({
        data: {
          itemId: item.id,
          sortOrder: 0,
          detail1Flag: true,
          detail1Title: '作業手順',
          detail1Content: '1. 車両をリフトアップする\n2. 既存ブーツを取り外す\n3. 新しいブーツを取り付ける\n4. 動作確認を行う',
          detail2Flag: true,
          detail2Title: '注意事項',
          detail2Content: 'グリスの飛散に注意し、保護メガネを着用すること。',
        },
      })
      console.log('研修教材マスタ: 1件を投入しました')
    }
  }

  // 資格マスタ
  const qualCount = await prisma.qualification.count()
  if (qualCount > 0) {
    console.log(`資格マスタ: 既に${qualCount}件あるため投入をスキップ`)
  } else {
    const quals = [
      { name: '自動車整備士2級', category: '国家資格' },
      { name: '危険物取扱者乙4', category: '国家資格' },
      { name: '社内整備認定A', category: '社内資格' },
    ]
    for (const q of quals) {
      await prisma.qualification.create({ data: q })
    }
    console.log(`資格マスタ: ${quals.length}件を投入しました`)
  }

  // 社員マスタ（部署に紐づけ。所属数の自動集計を確認できるようにする）
  const empCount = await prisma.employee.count()
  if (empCount > 0) {
    console.log(`社員マスタ: 既に${empCount}件あるため投入をスキップ`)
  } else {
    const seibi = await prisma.department.findFirst({ where: { name: '整備部' } })
    const eigyo = await prisma.department.findFirst({ where: { name: '営業部' } })
    const employees = [
      { employeeNo: 'E001', name: '山田 太郎', role: '評価者', departmentId: seibi?.id ?? null },
      { employeeNo: 'E002', name: '佐藤 次郎', role: '受講者', departmentId: seibi?.id ?? null },
      { employeeNo: 'E003', name: '鈴木 花子', role: '受講者', departmentId: eigyo?.id ?? null },
    ]
    for (const emp of employees) {
      await prisma.employee.create({ data: emp })
    }
    console.log(`社員マスタ: ${employees.length}件を投入しました`)
  }

  // E002・E003 を「大型研修」に履修登録（未登録なら）
  const oogataCourse = await prisma.trainingCourse.findFirst({ where: { name: '大型研修' } })
  if (oogataCourse) {
    for (const no of ['E002', 'E003']) {
      const emp = await prisma.employee.findUnique({
        where: { employeeNo: no },
        include: { enrolledCourses: true },
      })
      const already = emp?.enrolledCourses.some((c) => c.id === oogataCourse.id)
      if (emp && !already) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { enrolledCourses: { connect: { id: oogataCourse.id } } },
        })
        console.log(`${no}: 大型研修に履修登録しました`)
      }
    }
  }

  // テストログイン用パスワード（全員 test1234）。既存社員でも未設定なら設定する。
  const testLoginNos = ['E001', 'E002', 'E003']
  for (const no of testLoginNos) {
    const emp = await prisma.employee.findUnique({ where: { employeeNo: no } })
    if (emp && !emp.passwordHash) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { passwordHash: hashPassword('test1234') },
      })
      console.log(`${no}: テストパスワード(test1234)を設定しました`)
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })