# Martian - 取自“火星救援”

> "I'm gonna have to science the shit out of this." —— Mark Watney

## 1. 需求分析
**业务背景**：
在日常业务开发中，我们发现前端面临的错误挑战主要分为两类完全不同的极端情况：
1. **系统级灾难（System Crash）**：底层服务报错（如数据库挂掉、代码空指针）。这类情况需要“掩护”与“兜底”。
2. **业务规则拦截（Business Block）**：系统没问题，但客户**前置操作不到位**或业务链条存在依赖（例如“必须先实名才能下单”、“余额不足需要充值”、“状态已改变不能重复提交”）。这类情况需要的不是简单的报错提醒，而是**精准的操作指引和动作分发**。

程序员的职责是**“让代码尽量不出错”； 而 Martian 这套错误系统的职责是“当那个不可控的物理世界出错时，系统依然能体面地死、优雅地活，并且第一时间喊人来救火”**！

**核心使命**：
这个项目本质上是一个运维开发项目
建立了一个统一的“异常翻译中心”，兼顾受众使用诉求：
- **面向普通用户**：不仅进行高情商的安抚，根据拦截提示，就有了能力去做精准分发前端动作（引导用户跳页面、弹窗去完成前置操作）。
- **面向业务开发**：因为业务线会不断扩张，需要提供一个**可视化的“异常与操作注册界面”**。当开发定义了新的业务拦截阻断时，可以在这里直接注册新的错误码，并绑定对应的高情商文案与前端引导动作（Action），彻底告别写死在代码里的硬编码配置。



## 安装插件
### IDEA
路径：plugins\release\${version}.zip
直接在 IDEA 的操作路径内通过本地安装来使用这个插件： Settings (设置) -> Plugins (插件) -> 点击顶部齿轮 ⚙️ -> Install Plugin from Disk... (从磁盘安装插件...)，然后选中这个 zip 文件即可。

### VSCode
路径：plugins\release\${version}.vsix
直接在 VSCode 的操作路径内通过本地安装来使用这个插件： Plugins (插件) -> 点击顶部三个点 -> Install from vsix... 然后选中这个 vsix 文件即可。

## 配置
服务器目前开放地址：http://172.30.52.161:3001
### Java依赖

```xml
<dependencies>
    <dependency>
        <groupId>neo.porco</groupId>
        <artifactId>Huston</artifactId>
        <version>1.0.1-SNAPSHOT</version>
    </dependency>
</dependencies>
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>neo.porco</groupId>
                        <artifactId>Huston</artifactId>
                        <version>1.0.1-SNAPSHOT</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```
总之，咱们的错误码不用再自己建一堆啰嗦的常量类了。你只要在你的业务类头上挂个 @Martians({"错误码A", "错误码B"})，然后直接点编译，系统就会在后台自动给你生成一个 你的类名 + ErrCodes 的常量类。你直接 点 出来用就行，不用管它是怎么来的，连 Git 都不用提交它，干净又卫生！"
这个常量类里各个错误码的查看以及详情用插件提供支持，可以在统一的界面查看
在错误码的编写维护从制度上提供了全线统一的管理工具


## 后续迭代
### 前端界面
统一前端的标准提示

### 后端权限
这个再说，没想好