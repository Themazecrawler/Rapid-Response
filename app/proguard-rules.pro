-keepattributes Signature,InnerClasses,EnclosingMethod,RuntimeVisibleAnnotations,AnnotationDefault
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-keep class com.example.rapidresponse.model.** { *; }

-keep class com.example.rapidresponse.queue.AlertSyncWorker { *; }

-keep public class * extends java.lang.Exception
