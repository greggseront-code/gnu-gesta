import { uploadFilesSequentially } from './offer-upload-status';
import * as offersApi from './offers.api';

vi.mock('./offers.api', () => ({ uploadOfferAttachment: vi.fn() }));

test('envoie séquentiellement et retourne les seuls fichiers en échec', async () => {
  const first = new File(['1'], 'first.pdf', { type: 'application/pdf' });
  const second = new File(['2'], 'second.pdf', { type: 'application/pdf' });
  const third = new File(['3'], 'third.pdf', { type: 'application/pdf' });
  vi.mocked(offersApi.uploadOfferAttachment)
    .mockResolvedValueOnce({} as never)
    .mockRejectedValueOnce(new Error('réseau'))
    .mockResolvedValueOnce({} as never);

  const result = await uploadFilesSequentially(42, [first, second, third]);

  expect(offersApi.uploadOfferAttachment).toHaveBeenNthCalledWith(1, 42, first);
  expect(offersApi.uploadOfferAttachment).toHaveBeenNthCalledWith(2, 42, second);
  expect(offersApi.uploadOfferAttachment).toHaveBeenNthCalledWith(3, 42, third);
  expect(result.succeeded).toEqual([first, third]);
  expect(result.failed).toEqual([{ file: second, error: 'réseau' }]);
});
