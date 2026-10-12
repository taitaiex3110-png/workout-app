"use strict";

(() => {
  const byId = (id) => document.getElementById(id);
  const status = byId("backupStatus");
  let pending = null;
  const message = (text) => { status.textContent = text; };
  const current = () => WorkoutBackup.read(localStorage, state.templates);
  const filename = () => `workout-backup-${getTodayKey()}-${Date.now()}.json`;
  const text = (data) => JSON.stringify(WorkoutBackup.envelope(data), null, 2);
  function download(contents) {
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    message("ファイルの保存を開始しました。「ファイル」やダウンロード先に保存されたことを確認してください。");
  }
  function exportData(share) {
    try {
      if (hasUnsavedWorkout() && !confirm("入力中の未保存内容は含まれません。保存済みの記録を書き出しますか？")) return;
      const contents = text(current());
      if (share) {
        const file = new File([contents], filename(), { type: "application/json" });
        if (!navigator.canShare?.({ files: [file] })) return download(contents);
        navigator.share({ files: [file], title: "筋トレ記録バックアップ" }).then(() => {
          message("共有操作が終了しました。保存先でファイルを確認してください。");
        }).catch((error) => message(error.name === "AbortError" ? "共有をキャンセルしました。" : "共有できませんでした。「バックアップを書き出す」をお試しください。"));
      } else download(contents);
    } catch (error) { message(`書き出せませんでした。元の記録は変更していません。${error.message}`); }
  }
  byId("exportBackup").addEventListener("click", () => exportData(false));
  byId("shareBackup").hidden = !navigator.share;
  byId("shareBackup").addEventListener("click", () => exportData(true));
  byId("chooseBackup").addEventListener("click", () => byId("backupFile").click());
  function cancel() {
    pending = null;
    byId("backupPreview").hidden = true;
    byId("backupFile").value = "";
  }
  byId("cancelBackup").addEventListener("click", cancel);
  byId("backupFile").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    cancel();
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("20MB以下のファイルを選択してください。");
      pending = WorkoutBackup.parse(await file.text());
      const preview = WorkoutBackup.merge(current(), pending, "keep");
      const dates = Object.keys(pending.records).sort();
      byId("backupSummary").textContent = `${file.name}：記録 ${dates.length}日、テンプレート ${pending.templates.length}件。${dates.length ? `${dates[0]} ～ ${dates.at(-1)}。` : ""}重複する日付 ${preview.conflicts}日、テンプレート ${preview.templateConflicts}件。`;
      byId("backupConflict").value = "keep";
      byId("backupPreview").hidden = false;
      message("まだ取り込んでいません。内容と重複時の扱いを確認してください。");
    } catch (error) { cancel(); message(`読み込めませんでした。${error.message}`); }
  });
  byId("applyBackup").addEventListener("click", () => {
    if (!pending) return;
    if (hasUnsavedWorkout()) { message("入力中の内容があります。先にトレーニングを保存してから取り込んでください。"); return; }
    const policy = byId("backupConflict").value;
    if (!confirm(policy === "incoming" ? "同じ日付の全種目と同じテンプレートを、ファイルの内容で上書きします。取り込みますか？" : "既存の記録を残し、未登録の日付・テンプレートを取り込みますか？")) return;
    try {
      const merged = WorkoutBackup.merge(current(), pending, policy);
      WorkoutBackup.commit(localStorage, merged, state.templates);
      state.records = loadRecords();
      state.templates = loadTemplates();
      loadExercisesForDate(state.currentDate);
      editorBaseline = editorSnapshot();
      renderAll();
      renderSelectedDateDetail();
      cancel();
      byId("exportSafetyBackup").hidden = false;
      message("取り込みました。過去ログで内容を確認してください。取り込み直前のデータも下のボタンから書き出せます。");
    } catch (error) { message(error.message); }
  });
  try { byId("exportSafetyBackup").hidden = !localStorage.getItem(WorkoutBackup.safetyKey); } catch { /* Export reports storage errors. */ }
  byId("exportSafetyBackup").addEventListener("click", () => {
    try {
      const saved = localStorage.getItem(WorkoutBackup.safetyKey);
      if (!saved) throw new Error("退避データはありません。");
      WorkoutBackup.parse(saved);
      download(saved);
    } catch (error) { message(error.message); }
  });

  const updateStatus = byId("updateStatus");
  const applyUpdate = byId("applyAppUpdate");
  let registration;
  let updateRequested = false;
  function showWaiting() {
    if (registration?.waiting) {
      applyUpdate.hidden = false;
      updateStatus.textContent = "更新版の準備ができました。入力を保存してから「更新版を開く」を押してください。";
    }
  }
  function watchWorker(worker) {
    worker?.addEventListener("statechange", () => { if (worker.state === "installed") showWaiting(); });
  }
  async function register() {
    if (!("serviceWorker" in navigator) || !isSecureContext || !/^https?:$/.test(location.protocol)) {
      updateStatus.textContent = "アプリ更新はHTTPSで公開されたページで利用できます。";
      byId("checkAppUpdate").disabled = true;
      return;
    }
    try {
      registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
      watchWorker(registration.installing);
      showWaiting();
    } catch { updateStatus.textContent = "更新を確認できませんでした。通信状態を確認して再度お試しください。"; }
  }
  byId("checkAppUpdate").addEventListener("click", async () => {
    try {
      if (!registration) await register();
      if (!registration) return;
      await registration.update();
      updateStatus.textContent = registration.installing ? "更新版を取得しています。" : "更新確認が完了しました。更新版が届くとボタンが表示されます。";
      showWaiting();
    } catch { updateStatus.textContent = "更新を確認できませんでした。オンラインでお試しください。"; }
  });
  applyUpdate.addEventListener("click", () => {
    if (hasUnsavedWorkout()) { updateStatus.textContent = "入力中の内容があります。先に保存してください。"; return; }
    if (!registration?.waiting || !confirm("保存済みの記録を維持して、アプリを再読み込みしますか？")) return;
    updateRequested = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updateRequested) location.reload();
    else updateStatus.textContent = "更新が反映されました。入力を保存してから、次回アプリを開き直してください。";
  });
  register();
})();
