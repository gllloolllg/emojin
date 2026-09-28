import {createCloud} from './gas-client.js';
try {
  window.EmojinCloud=await createCloud();
  await import('./app.js');
} catch(error) {
  console.error('初期化に失敗しました',error);
  document.getElementById('bootScreen').classList.add('hidden');
  const toast=document.getElementById('toast');
  toast.textContent=error.message||'接続できませんでした。再読み込みしてください。';
  toast.classList.remove('hidden');
}
