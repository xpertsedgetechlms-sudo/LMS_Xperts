# Branded PDF completion certificates

The server now generates an A4 landscape PDF using Apache PDFBox 3.0.8, embedded SIL Open Font License Noto Sans fonts, and the supplied XpertsEdge logo. Learner/course names and date are taken from the issued certificate database snapshot. The PDF includes the unique certificate ID and institute contact for current-status verification.

Use Certificates -> Download PDF certificate. Issuing still requires the existing completion checks and administrator permission. Download requires authentication and either certificate ownership, administrator access or the course's assigned trainer scope. A student can download their issued record even after course access expires. Revoked certificates cannot be downloaded again. Previously downloaded/printed files cannot be recalled: contact the institute to verify current status.

No signature, government accreditation, QR verification service or cryptographic digital signature is fabricated. Approve the wording with the institute before issuing real certificates. This is an institute learning record, not a degree or professional licence. The visual sample is marked SAMPLE - NOT ISSUED and is not a learner credential.

Long names/course titles resize and wrap. The bundled font supports Latin and many additional characters, but is not a complete Indic/CJK font system. Unsupported names return a clear error rather than silently replacing the learner name. Arrange a reviewed certificate/font extension for those scripts; do not change the learner's legal name automatically.

Restart Java to use the new endpoint. Production Docker builds include the logo and fonts from backend/src/main/resources/certificate. Backend tests parse generated PDFs and check ownership/revocation; the sample was rendered with Poppler and visually inspected. The browser workflow test now expects a PDF filename. This turn did not rerun browser automation because browser observation was blocked earlier.

PDFBox official release reference: https://pdfbox.apache.org/blog/
Font source and licence: https://github.com/notofonts/noto-fonts
