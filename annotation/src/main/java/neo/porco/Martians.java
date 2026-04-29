package neo.porco;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a type as being associated with one or more Martian identifiers.
 * <p>
 * Use this annotation on classes, interfaces, or other types when they should
 * be tagged with a set of Martian names or labels that can be inspected at
 * runtime.
 */
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Martians {
    /**
     * The Martian names or labels associated with the annotated type.
     * <p>
     * Provide zero or more values. When omitted, the annotation indicates that
     * the type is marked as Martian-related without any specific names.
     *
     * @return the Martian identifiers attached to the annotated type
     */
    String[] value() default {};
}