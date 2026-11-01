---
name: Protected document previews
description: Browser-preview limitations and security constraints for viewing private tutor documents.
---

A successful authenticated PDF fetch does not prove the user can see the file. In the automated preview browser, navigating a preopened tab directly to the fetched PDF blob left a blank tab even though the endpoint returned a valid PDF and rejected anonymous access.

**Why:** Testing uncovered a display failure after the authorization and file delivery already worked. Relaxing server permissions would not solve that failure.

**How to apply:** Keep private files behind the existing least-privilege authorization. Fetch with an authorization header, never credentials in a URL. Provide visible loading/errors and an explicit download fallback alongside an embedded PDF/image preview. Keep the blob usable for the viewer's lifetime. Distinguish browser PDF-rendering support from a failed download when reporting verification.
