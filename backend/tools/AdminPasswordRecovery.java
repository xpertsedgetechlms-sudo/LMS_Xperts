import java.sql.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class AdminPasswordRecovery {
    public static void main(String[] args) {
        boolean reset=args.length==1&&args[0].equals("--reset");
        if(!reset&&!(args.length==1&&args[0].equals("--check"))){System.out.println("Use --check or --reset from the private PowerShell helper.");return;}
        String email=System.getenv("LOCAL_ADMIN_RESET_EMAIL");
        String password=System.getenv("LOCAL_ADMIN_NEW_PASSWORD");
        if(email==null||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")){System.err.println("A valid administrator email is required.");System.exit(1);}
        if(reset&&(password==null||password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72)){System.err.println("Use at least 12 characters and at most 72 UTF-8 bytes.");System.exit(1);}
        try {
            Class.forName("org.postgresql.Driver");
            try(Connection connection=DriverManager.getConnection("jdbc:postgresql://127.0.0.1:5432/xpertsedge_lms","xpertsedge",System.getenv("DB_PASSWORD"))){
                connection.setAutoCommit(false);
                try {
                    UUID id;String name;
                    try(PreparedStatement statement=connection.prepareStatement("SELECT id,name,role,enabled FROM public.app_users WHERE email=? FOR UPDATE")){
                        statement.setString(1,email.strip().toLowerCase(java.util.Locale.ROOT));
                        try(ResultSet result=statement.executeQuery()){
                            if(!result.next()||!result.getString("role").equals("ADMIN")||!result.getBoolean("enabled"))throw new IllegalStateException("An enabled administrator account was not found. No changes made.");
                            id=result.getObject("id",UUID.class);name=result.getString("name");
                        }
                    }
                    if(!reset){connection.rollback();System.out.println("Enabled administrator account verified. Password was not changed.");return;}
                    String hash=new BCryptPasswordEncoder(12).encode(password);
                    try(PreparedStatement statement=connection.prepareStatement("UPDATE public.app_users SET password_hash=?,credential_version=credential_version+1 WHERE id=?")){
                        statement.setString(1,hash);statement.setObject(2,id);statement.executeUpdate();
                    }
                    try(PreparedStatement statement=connection.prepareStatement("DELETE FROM public.password_reset_tokens WHERE user_id=?")){statement.setObject(1,id);statement.executeUpdate();}
                    try(PreparedStatement statement=connection.prepareStatement("INSERT INTO public.activity_events(actor_id,actor_name,request_method,route,response_status,created_at) VALUES(?,?,'LOCAL','/local/admin-password-recovery',200,?)")){
                        statement.setObject(1,id);statement.setString(2,name);statement.setTimestamp(3,Timestamp.from(Instant.now()));statement.executeUpdate();
                    }
                    connection.commit();System.out.println("Administrator password reset successfully. Sign in with the password you just entered. Previous sessions are revoked.");
                } catch(Exception e){connection.rollback();throw e;}
            }
        } catch(SQLException e){System.err.println("Database operation failed (SQL state "+e.getSQLState()+"). No reset was committed. Check the database password and that migrations V8+ are installed.");System.exit(1);}
        catch(Exception e){System.err.println(e instanceof IllegalStateException?e.getMessage():"Recovery could not run. Check the installed JDK and built backend dependencies.");System.exit(1);}
    }
}
