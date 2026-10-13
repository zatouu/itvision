export const FileSystemUploadType = {
  MULTIPART: 'multipart',
}

export const uploadAsync = jest.fn(async () => ({
  status: 200,
  body: JSON.stringify({ success: true }),
}))

