package com.xpertsedge.lms;

import com.xpertsedge.lms.domain.Role;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="LMS_BROWSER_VERIFY",matches="true")
class WorkspaceBrowserTests extends WorkspaceWorkflowTests {
    @DynamicPropertySource static void browserOrigin(DynamicPropertyRegistry registry){registry.add("lms.allowed-origins",()->"http://127.0.0.1:5317");}
    @Override @Test void adminToCertificateAndOwnProfileWorkflow()throws Exception{
        assertTrue(postgres(),"Browser verification requires the isolated PostgreSQL schema.");
        identities.create("Browser Administrator","admin@browser.example",PASSWORD,Role.ADMIN);
        assertEquals(schema(),db.queryForObject("SELECT current_schema()",String.class));
        Path root=Path.of("").toAbsolutePath().getParent();
        Path output=Path.of(System.getenv("LMS_BROWSER_OUTPUT"));Files.createDirectories(output);
        ProcessBuilder builder=new ProcessBuilder(System.getenv("LMS_NODE_EXECUTABLE"),root.resolve("work/test-browser-workflow.mjs").toString());
        builder.directory(root.toFile());builder.redirectErrorStream(true);builder.redirectOutput(output.resolve("browser-run.log").toFile());
        builder.environment().put("LMS_TEST_BACKEND","http://127.0.0.1:"+port);
        builder.environment().put("LMS_BROWSER_PASSWORD",PASSWORD);
        builder.environment().remove("DB_PASSWORD");
        Process runner=builder.start();
        if(!runner.waitFor(12,TimeUnit.MINUTES)){runner.destroyForcibly();fail("Browser verification exceeded its time limit.");}
        assertEquals(0,runner.exitValue(),Files.readString(output.resolve("browser-run.log")));
    }
}
