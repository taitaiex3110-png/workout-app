(function (root) {
  "use strict";
  const keys = ["workout-routine-app-records", "workout-routine-app-templates"];
  const journalKey = "workout-routine-app-import-journal";
  const safetyKey = "workout-routine-app-before-import";
  const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function validateExercise(exercise, template = false) {
    requireValue(object(exercise) && typeof exercise.name === "string", "種目名の形式が正しくありません。");
    requireValue(exercise.notes === undefined || typeof exercise.notes === "string", "メモの形式が正しくありません。");
    requireValue(exercise.bodyPart === undefined || ["chest", "back", "legs", "shoulders", "triceps", "biceps", "arms", "arm", "腕"].includes(exercise.bodyPart), "部位の形式が正しくありません。");
    const number = (value) => value === undefined || value === "" || ((typeof value === "number" || typeof value === "string") && String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
    if (Array.isArray(exercise.sets)) {
      requireValue(exercise.sets.length <= 1000, "1種目のセット数が多すぎます。");
      exercise.sets.forEach((set) => requireValue(object(set) && number(set.weight) && number(set.reps), "セットの重量・回数が正しくありません。"));
    } else {
      requireValue(!template && number(exercise.weight) && number(exercise.reps) && number(exercise.sets) && Number.isInteger(Number(exercise.sets ?? 1)) && Number(exercise.sets ?? 1) <= 1000, "セットの形式が正しくありません。");
    }
    if (template) requireValue(typeof exercise.id === "string" && exercise.id.length > 0, "テンプレートIDが正しくありません。");
  }
  function validateData(records, templates) {
    requireValue(object(records) && Array.isArray(templates), "記録・テンプレートの形式が正しくありません。");
    Object.entries(records).forEach(([date, record]) => {
      requireValue(validDate(date) && object(record) && (record.date === undefined || record.date === date), "記録の日付が正しくありません。");
      requireValue(record.split === undefined || ["Push", "Pull", "Legs"].includes(record.split), "Splitが正しくありません。");
      requireValue(Array.isArray(record.exercises), "種目一覧が正しくありません。");
      record.exercises.forEach((exercise) => validateExercise(exercise));
    });
    templates.forEach((template) => validateExercise(template, true));
    requireValue(new Set(templates.map((template) => template.id)).size === templates.length, "テンプレートIDが重複しています。");
    return { records, templates };
  }
  function read(storage, fallbackTemplates = []) {
    const recordsRaw = storage.getItem(keys[0]);
    const templatesRaw = storage.getItem(keys[1]);
    return validateData(recordsRaw === null ? {} : JSON.parse(recordsRaw), templatesRaw === null ? clone(fallbackTemplates) : JSON.parse(templatesRaw));
  }
  function envelope(data) {
    return { app: "workout-routine-app", version: 1, exportedAt: new Date().toISOString(), records: clone(data.records), templates: clone(data.templates) };
  }
  function parse(text) {
    requireValue(new TextEncoder().encode(text).length <= 20 * 1024 * 1024, "20MB以下のファイルを選択してください。");
    const value = JSON.parse(text);
    requireValue(object(value) && value.app === "workout-routine-app" && value.version === 1, "このアプリのバックアップ（形式1）を選択してください。");
    return clone(validateData(value.records, value.templates));
  }
  const identity = (template) => `${template.bodyPart || "chest"}\u0000${template.name.trim().toLowerCase()}`;
  function merge(current, incoming, policy) {
    requireValue(["keep", "incoming"].includes(policy), "取り込み方法が正しくありません。");
    validateData(current.records, current.templates);
    validateData(incoming.records, incoming.templates);
    const output = clone(current);
    let conflicts = 0;
    for (const [date, record] of Object.entries(incoming.records)) {
      const exists = own(output.records, date);
      if (exists) conflicts += 1;
      if (!exists || policy === "incoming") output.records[date] = clone(record);
    }
    let templateConflicts = 0;
    incoming.templates.forEach((template) => {
      const index = output.templates.findIndex((item) => identity(item) === identity(template));
      if (index >= 0) {
        templateConflicts += 1;
        if (policy === "incoming") output.templates[index] = { ...clone(template), id: output.templates[index].id };
      } else {
        const added = clone(template);
        while (output.templates.some((item) => item.id === added.id)) added.id += "-import";
        output.templates.push(added);
      }
    });
    return { ...output, conflicts, templateConflicts };
  }
  function restoreRaw(storage, raw) {
    requireValue(Array.isArray(raw) && raw.length === 2 && raw.every((value) => value === null || typeof value === "string"), "復旧用データの形式が正しくありません。");
    keys.forEach((key, index) => {
      if (raw[index] === null) storage.removeItem(key);
      else storage.setItem(key, raw[index]);
    });
  }
  function recover(storage) {
    const journal = storage.getItem(journalKey);
    if (journal === null) return;
    restoreRaw(storage, JSON.parse(journal));
    storage.removeItem(journalKey);
  }
  function commit(storage, data, fallbackTemplates = []) {
    validateData(data.records, data.templates);
    recover(storage);
    const before = read(storage, fallbackTemplates);
    const raw = keys.map((key) => storage.getItem(key));
    // Journal both original keys before either changes, for crash recovery.
    storage.setItem(safetyKey, JSON.stringify(envelope(before)));
    storage.setItem(journalKey, JSON.stringify(raw));
    try {
      storage.setItem(keys[0], JSON.stringify(data.records));
      storage.setItem(keys[1], JSON.stringify(data.templates));
      storage.removeItem(journalKey);
    } catch (error) {
      try { recover(storage); } catch { throw new Error("取り込みが中断しました。サイトデータを削除せず、アプリを開き直してください。"); }
      throw new Error("保存領域が不足しているか、保存が許可されていません。取り込み前の記録に戻しました。");
    }
  }
  root.WorkoutBackup = { keys, safetyKey, journalKey, read, envelope, parse, merge, commit, recover, validateData };
  if (typeof module !== "undefined") module.exports = root.WorkoutBackup;
})(globalThis);
