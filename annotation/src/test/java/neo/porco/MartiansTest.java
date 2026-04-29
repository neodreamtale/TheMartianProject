package neo.porco;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MartiansTest {

    // 1. 定义一个使用了 @Martians 注解的类，并传入多个值
    @Martians({ "Error_USER_NOT_FOUND", "Error_INVALID_PASSWORD" })
    static class LoginService {
    }

    // 2. 定义一个使用了 @Martians 注解的类，不传值（测试默认值）
    @Martians
    static class DefaultService {
    }

    @Test
    void testAnnotationWithValues() {
        // 通过反射获取 LoginService 上的注解
        Martians martians = LoginService.class.getAnnotation(Martians.class);

        assertNotNull(martians, "注解应该存在");

        // 验证读取到的值是否和定义的一样
        assertArrayEquals(new String[] { "Error_USER_NOT_FOUND", "Error_INVALID_PASSWORD" }, martians.value());
    }

    @Test
    void testAnnotationDefaultValue() {
        // 通过反射获取 DefaultService 上的注解
        Martians martians = DefaultService.class.getAnnotation(Martians.class);

        assertNotNull(martians, "注解应该存在");

        // 验证默认值是一个空数组
        assertArrayEquals(new String[] {}, martians.value());
    }
}
