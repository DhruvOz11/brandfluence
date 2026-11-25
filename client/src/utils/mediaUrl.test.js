import { getMediaUrl } from './mediaUrl';

test('normalizes Windows upload paths to the API media URL', () => {
  expect(getMediaUrl('uploads\\creator-work.jpg'))
    .toBe('http://localhost:5000/uploads/creator-work.jpg');
});

test('preserves absolute media URLs and client public paths', () => {
  expect(getMediaUrl('https://cdn.example.com/work.jpg'))
    .toBe('https://cdn.example.com/work.jpg');
  expect(getMediaUrl('/default-avatar.png')).toBe('/default-avatar.png');
});
