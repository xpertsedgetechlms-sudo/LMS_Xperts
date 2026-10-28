package com.xpertsedge.lms;

import com.xpertsedge.lms.learning.CertificatePdf;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class CertificatePdfTests {
    @Test void brandedPdfContainsIssuedFieldsAndFitsLongNames()throws Exception{
        var pdf=new CertificatePdf();String code="XE-SAMPLE-00000000-0000-0000-0000-000000000001";
        byte[] bytes=pdf.create("Irfan Abdullah","Software Development",code,Instant.parse("2026-10-23T08:00:00Z"),true);
        try(var document=Loader.loadPDF(bytes)){
            assertEquals(1,document.getNumberOfPages());var text=new PDFTextStripper().getText(document);
            assertTrue(text.contains("Irfan Abdullah"));assertTrue(text.contains("Software Development"));assertTrue(text.contains(code));assertTrue(text.contains("23 October 2026"));assertTrue(text.contains("SAMPLE - NOT ISSUED"));
        }
        var folder=Path.of("target/certificate-preview");Files.createDirectories(folder);Files.write(folder.resolve("XpertsEdge-Sample-Certificate.pdf"),bytes);
        byte[] longNames=pdf.create("W".repeat(100),"W".repeat(150),code,Instant.now(),false);
        try(var doc=Loader.loadPDF(longNames)){assertEquals(1,doc.getNumberOfPages());assertTrue(new PDFTextStripper().getText(doc).contains("CERTIFICATE OF COMPLETION"));}
        byte[] unicode=pdf.create("Zoë José Müller","AWS & DevOps",code,Instant.now(),false);
        try(var doc=Loader.loadPDF(unicode)){assertTrue(new PDFTextStripper().getText(doc).contains("Zoë José Müller"));}
    }
}
