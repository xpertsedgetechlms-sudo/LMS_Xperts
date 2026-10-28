package com.xpertsedge.lms.learning;

import org.springframework.stereotype.Service;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import java.awt.Color;
import java.io.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class CertificatePdf {
    private static final Color NAVY=new Color(22,54,79),GREEN=new Color(23,125,83),MUTED=new Color(83,103,115);
    private InputStream resource(String name)throws IOException{var stream=getClass().getResourceAsStream("/certificate/"+name);if(stream==null)throw new IOException("Missing certificate resource");return stream;}
    private String clean(String text){return text.replaceAll("[\\p{Cc}\\p{Cf}]"," ").strip();}
    private float width(PDFont font,String text,float size)throws IOException{return font.getStringWidth(text)*size/1000;}
    private void text(PDPageContentStream c,PDFont font,float size,float x,float y,String value,Color color)throws IOException{c.setNonStrokingColor(color);c.beginText();c.setFont(font,size);c.newLineAtOffset(x,y);c.showText(value);c.endText();}
    private void center(PDPageContentStream c,PDFont font,float size,float y,String value,Color color)throws IOException{text(c,font,size,(842-width(font,value,size))/2,y,value,color);}
    private void fit(PDPageContentStream c,PDFont font,float size,float y,String value,Color color)throws IOException{
        value=clean(value);while(size>14&&width(font,value,size)>650)size-=.5f;
        if(width(font,value,size)<=650){center(c,font,size,y,value,color);return;}
        // Bounded fields can still contain long names: wrap without dropping characters.
        List<String> lines=new ArrayList<>();StringBuilder line=new StringBuilder();
        for(int cp:value.codePoints().toArray()){String next=line.toString()+new String(Character.toChars(cp));if(width(font,next,size)>650){lines.add(line.toString());line.setLength(0);}line.appendCodePoint(cp);}if(!line.isEmpty())lines.add(line.toString());
        for(int i=0;i<lines.size();i++)center(c,font,size,y-i*(size+4),lines.get(i),color);
    }
    public byte[] create(String student,String course,String code,Instant issuedAt,boolean sample)throws IOException{
        try(PDDocument doc=new PDDocument();ByteArrayOutputStream output=new ByteArrayOutputStream();InputStream regular=resource("NotoSans-Regular.ttf");InputStream boldFile=resource("NotoSans-Bold.ttf")){
            var font=PDType0Font.load(doc,regular);var bold=PDType0Font.load(doc,boldFile);var page=new PDPage(new PDRectangle(842,595));doc.addPage(page);
            doc.getDocumentInformation().setTitle("XpertsEdge Certificate of Completion");doc.getDocumentInformation().setAuthor("XpertsEdge Technologies");
            try(var c=new PDPageContentStream(doc,page)){
                c.setNonStrokingColor(new Color(247,251,249));c.addRect(0,0,842,595);c.fill();
                c.setNonStrokingColor(NAVY);c.addRect(0,0,18,595);c.fill();
                c.setStrokingColor(new Color(180,208,195));c.setLineWidth(1);c.addRect(34,30,774,535);c.stroke();
                c.setNonStrokingColor(GREEN);c.addRect(34,552,140,13);c.fill();
                try(var logo=resource("logo.png")){var img=PDImageXObject.createFromByteArray(doc,logo.readAllBytes(),"XpertsEdge logo");c.drawImage(img,66,462,76,76);}
                text(c,bold,19,160,510,"XpertsEdge Technologies",NAVY);text(c,font,10,160,489,"Building Success Beyond Boundaries",GREEN);
                if(sample)text(c,bold,11,626,510,"SAMPLE - NOT ISSUED",GREEN);
                center(c,bold,30,418,"CERTIFICATE OF COMPLETION",NAVY);
                center(c,font,12,384,"This certificate is presented to",MUTED);
                fit(c,bold,32,337,student,NAVY);
                c.setStrokingColor(new Color(185,212,197));c.moveTo(250,307);c.lineTo(592,307);c.stroke();
                center(c,font,12,280,"for completing the learning and assessment requirements for",MUTED);
                fit(c,bold,24,243,course,GREEN);
                text(c,bold,10,72,159,"ISSUED ON",MUTED);text(c,font,12,72,138,DateTimeFormatter.ofPattern("dd MMMM yyyy",Locale.ENGLISH).withZone(ZoneId.of("Asia/Kolkata")).format(issuedAt),NAVY);
                text(c,bold,10,480,159,"ISSUING INSTITUTE",MUTED);text(c,font,12,480,138,"XpertsEdge Technologies",NAVY);
                text(c,font,9,72,96,"Certificate ID: "+code,NAVY);
                text(c,font,8,72,72,"Verify current status with the institute: xpertsedgetechlms@gmail.com | +91 88707 83300",MUTED);
                text(c,font,8,72,55,"Institute-issued learning record. This document is not digitally signed.",MUTED);
            }
            doc.save(output);return output.toByteArray();
        }
    }
}
