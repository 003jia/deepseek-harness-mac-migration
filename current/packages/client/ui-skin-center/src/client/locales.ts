/** `settings.skin-center` namespace dictionaries (the Skin center page's copy). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '皮肤中心',
  'title': '皮肤中心',
  'intro': '自定义背景动图与玻璃面板效果。',
  'glass.title': '玻璃效果',
  'glass.intro': '调整三栏面板的磨砂玻璃观感，实时生效。',
  'glass.opacity': '透明度',
  'glass.blur': '模糊程度',
  'glass.reset': '恢复默认',
  'background.title': '背景动图',
  'background.intro': '上传一张动图或图片作为整个界面的背景。',
  'background.enable': '启用背景',
  'background.upload': '上传图片',
  'background.replace': '更换图片',
  'background.remove': '移除背景',
  'background.uploading': '上传中…',
  'background.uploadFailed': '上传失败',
  'background.scrim': '蒙版浓度',
  'background.blur': '背景模糊',
  'background.size': '填充方式',
  'background.size.cover': '铺满',
  'background.size.contain': '完整显示',
  'background.noImage': '尚未选择背景图',
} satisfies Record<string, string>

/** The settings.skin-center namespace key union. */
export type SkinCenterKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'nav': 'Skin Center',
  'title': 'Skin Center',
  'intro': 'Customize the animated background and glass panel effect.',
  'glass.title': 'Glass effect',
  'glass.intro': 'Tune the frosted-glass look of all three columns; changes apply live.',
  'glass.opacity': 'Opacity',
  'glass.blur': 'Blur',
  'glass.reset': 'Reset to defaults',
  'background.title': 'Animated background',
  'background.intro': 'Upload an animated or still image as the whole-interface background.',
  'background.enable': 'Enable background',
  'background.upload': 'Upload image',
  'background.replace': 'Replace image',
  'background.remove': 'Remove background',
  'background.uploading': 'Uploading…',
  'background.uploadFailed': 'Upload failed',
  'background.scrim': 'Scrim strength',
  'background.blur': 'Background blur',
  'background.size': 'Fill mode',
  'background.size.cover': 'Cover',
  'background.size.contain': 'Contain',
  'background.noImage': 'No background image yet',
} satisfies Record<SkinCenterKey, string>
