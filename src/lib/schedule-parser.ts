/**
 * 快捷项目排期 - 类 Markdown 文本解析器
 * 任务以 "- " 开头；优先级标记可放在任务最前面（名称前连续 ! 数量：无=普通，!=低，!!=高，!!!=极高）；-->#n 为依赖；[nd]/[nmd] 为耗时/人天；@xxx 为角色；> 为备注
 */

export type Priority = 'normal' | 'low' | 'high' | 'urgent';

export interface Task {
  id: number;
  name: string;
  priority: Priority;
  dependsOn: number[];
  durationDays: number | null;
  personDays: number | null;
  notes: string;
  roles: string[];
  /** 由排期计算填充 */
  computedStart?: Date;
  computedEnd?: Date;
}

const RE_TASK_START = /^-\s+/;
const RE_NOTE_LINE = /^\s+>\s*/;
const RE_DEPENDENCY = /-->#(\d+)/g;
const RE_DURATION = /\[(\d+(?:\.\d+)?)d\]/g;
const RE_PERSON_DAYS = /\[(\d+(?:\.\d+)?)md\]/g;
const RE_ROLE = /@(\S+)/g;

function parsePriorityAndName(line: string): { priority: Priority; name: string } {
  let priority: Priority = 'normal';
  let name = line.trim();
  let leading = 0;
  while (leading < name.length && name[leading] === '!') {
    leading++;
  }
  if (leading >= 3) {
    priority = 'urgent';
  } else if (leading === 2) {
    priority = 'high';
  } else if (leading === 1) {
    priority = 'low';
  }
  name = name.slice(leading).trim();
  return { priority, name };
}

/**
 * 从内容中移除已解析的标记，得到纯任务名称。
 * 只移除“备注”的 >...（> 不作为 --> 的一部分时），不误删依赖箭头后的内容。
 */
function stripMarkersFromName(content: string): string {
  let s = content
    .replace(/-->#\d+/g, '')
    .replace(/\[\d+(?:\.\d+)?d\]/g, '')
    .replace(/\[\d+(?:\.\d+)?md\]/g, '')
    .replace(/@\S+/g, '');
  const noteStart = findNoteStart(s);
  if (noteStart !== -1) s = s.slice(0, noteStart);
  return s.replace(/\s+/g, ' ').trim();
}

/** 找到行内备注起始位置（第一个非 --> 的 >），不存在返回 -1 */
function findNoteStart(line: string): number {
  let idx = 0;
  while (idx < line.length) {
    const found = line.indexOf('>', idx);
    if (found === -1) return -1;
    const isPartOfArrow = found >= 2 && line[found - 1] === '-' && line[found - 2] === '-';
    if (!isPartOfArrow) return found;
    idx = found + 1;
  }
  return -1;
}

function parseDependencies(line: string): number[] {
  const deps: number[] = [];
  let m: RegExpExecArray | null;
  RE_DEPENDENCY.lastIndex = 0;
  while ((m = RE_DEPENDENCY.exec(line)) !== null) {
    deps.push(parseInt(m[1], 10));
  }
  return deps;
}

function parseDuration(line: string): number | null {
  const m = line.match(/\[(\d+(?:\.\d+)?)d\]/);
  return m ? parseFloat(m[1]) : null;
}

function parsePersonDays(line: string): number | null {
  const m = line.match(/\[(\d+(?:\.\d+)?)md\]/);
  return m ? parseFloat(m[1]) : null;
}

function parseRoles(line: string): string[] {
  const roles: string[] = [];
  let m: RegExpExecArray | null;
  RE_ROLE.lastIndex = 0;
  while ((m = RE_ROLE.exec(line)) !== null) {
    roles.push(m[1]);
  }
  return roles;
}

/**
 * 从一行或“行内”提取备注：仅当 ">" 为备注符号时（非依赖箭头 -->#n 的一部分）
 * 依赖为 -->#1 等形式，其 ">" 前有 "--"，不能当作备注起始
 */
function parseInlineNote(line: string): string {
  let idx = 0;
  while (idx < line.length) {
    const found = line.indexOf('>', idx);
    if (found === -1) return '';
    const isPartOfArrow = found >= 2 && line[found - 1] === '-' && line[found - 2] === '-';
    if (!isPartOfArrow) {
      return line.slice(found + 1).replace(/^\s+/, '').trim();
    }
    idx = found + 1;
  }
  return '';
}

/**
 * 解析类 Markdown 排期文本，返回任务列表（不含 computedStart/computedEnd）
 */
export function parseScheduleText(text: string): Task[] {
  const lines = text.split(/\r?\n/);
  const tasks: Task[] = [];
  let i = 0;
  let id = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!RE_TASK_START.test(line)) {
      i++;
      continue;
    }

    id++;
    const content = line.replace(RE_TASK_START, '').trim();
    const { priority } = parsePriorityAndName(content);
    const name = stripMarkersFromName(content.replace(/^!+/, '').trim());
    const dependsOn = parseDependencies(content);
    const durationDays = parseDuration(content);
    const personDays = parsePersonDays(content);
    const roles = parseRoles(content);
    let notes = parseInlineNote(content);

    i++;
    while (i < lines.length && RE_NOTE_LINE.test(lines[i])) {
      notes += (notes ? '\n' : '') + lines[i].replace(RE_NOTE_LINE, '').trim();
      i++;
    }

    tasks.push({
      id,
      name,
      priority,
      dependsOn,
      durationDays,
      personDays,
      notes,
      roles,
    });
  }

  return tasks;
}
