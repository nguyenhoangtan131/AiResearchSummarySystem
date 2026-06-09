export function formatModelLabel(modelName: string) {
  const normalized = modelName.replace(/^models\//, '').trim();
  const parts = normalized.split('-').filter(Boolean);

  if (parts[0] === 'gemini') {
    const version = parts[1] ?? '';
    const family = parts[2] ? capitalize(parts[2]) : '';
    const variant = parts
      .slice(3)
      .filter((part) => part !== 'preview')
      .map(capitalize)
      .join(' ');
    const preview = parts.includes('preview') ? ' Preview' : '';

    return ['Gemini', version, family, variant].filter(Boolean).join(' ') + preview;
  }

  return normalized;
}

export function formatStepTitle(stepKey: string, label: string) {
  const normalizedKey = stepKey.trim().toLowerCase();
  const normalizedLabel = label.trim().toLowerCase();
  const titleMap: Record<string, string> = {
    blueprint: 'Tạo bố cục tổng thể',
    title: 'Gợi ý tiêu đề chương',
    brief: 'Sinh tóm tắt chương',
    guide: 'Sinh định hướng viết chương',
    citation: 'Lấy trích dẫn và nguồn học thuật',
    source: 'Tìm và chọn nguồn tham khảo',
    writing: 'Sinh nội dung chương',
    generation: 'Sinh nội dung chương',
    article_generation: 'Sinh nội dung chương',
    finalization: 'Hoàn thiện bài viết',
  };
  const legacyLabelMap: Record<string, string> = {
    'tao bo cuc tong the': 'Tạo bố cục tổng thể',
    'sinh tieu de chuong': 'Gợi ý tiêu đề chương',
    'sinh tom tat chuong': 'Sinh tóm tắt chương',
    'sinh dinh huong viet chuong': 'Sinh định hướng viết chương',
    'lay trich dan va nguon hoc thuat': 'Lấy trích dẫn và nguồn học thuật',
    'sinh noi dung chuong': 'Sinh nội dung chương',
    'de xuat bo cuc tong the': 'Đề xuất bố cục tổng thể',
    'sinh noi dung cac chuong nghien cuu': 'Sinh nội dung các chương nghiên cứu',
    'hoan tat bai viet': 'Hoàn thiện bài viết',
  };

  return titleMap[normalizedKey] ?? legacyLabelMap[normalizedLabel] ?? label;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
