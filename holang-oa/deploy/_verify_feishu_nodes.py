import feishu_sync_followups as base
parents = {
    'OA跟进记录归档': 'QADqwQVJtitMp9kCXifcpvkcnAf',
    'OA AI对话归档':  'AkXpw1PC2ihDEGkLgnJcWd1Gn0K',
    'OA联系人备注':   'HHhjwmPgjiAAk6k6RPacZn5PnQe',
}
for title, tok in parents.items():
    try:
        titles = base.list_children_titles(tok)
        print('%-18s token=%-28s children=%d' % (title, tok, len(titles)))
    except Exception as e:
        print('%-18s token=%-28s ERROR %s' % (title, tok, str(e)[:200]))
