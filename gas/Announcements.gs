/** Manual administrator posting. Edit only the text between the backticks below. */
const ANNOUNCEMENT_BODY = `
`;

/** Select this function and run once to publish the text above. No trigger is needed. */
function postAnnouncement() {
  return publishAnnouncement_(ANNOUNCEMENT_BODY);
}

function publishAnnouncement_(text) {
  if(typeof text!=='string' || !text.trim())throw Error('ANNOUNCEMENT_BODYの中に、お知らせの本文を入力してください。');
  const body=text.trim(),store=firestore_();
  // Keep the ID outside the transaction callback so a retry cannot add another document.
  const id='a-'+Utilities.getUuid(),path='announcements/'+id;
  const result=store.transaction(tx=>{
    const existing=tx.get(path);
    if(existing)return {writes:[],value:{id,published:true}};
    const write=tx.write(path,{body,published:true});
    // Firestore supplies a real Timestamp, independently of the script's clock/timezone.
    write.updateTransforms=[{fieldPath:'publishedAt',setToServerValue:'REQUEST_TIME'}];
    return {writes:[write],value:{id,published:true}};
  });
  console.log('お知らせを公開しました。 '+JSON.stringify(result));
  return result;
}
