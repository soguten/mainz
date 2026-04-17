import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";
import { AlertPage } from "./pages/components/Alert.page.tsx";
import { AccordionPage } from "./pages/components/Accordion.page.tsx";
import { AnchorPage } from "./pages/components/Anchor.page.tsx";
import { AvatarPage } from "./pages/components/Avatar.page.tsx";
import { BadgePage } from "./pages/components/Badge.page.tsx";
import { BreadcrumbPage } from "./pages/components/Breadcrumb.page.tsx";
import { ButtonPage } from "./pages/components/Button.page.tsx";
import { CardPage } from "./pages/components/Card.page.tsx";
import { CalloutPage } from "./pages/components/Callout.page.tsx";
import { CenterPage } from "./pages/components/Center.page.tsx";
import { CheckboxPage } from "./pages/components/Checkbox.page.tsx";
import { ClusterPage } from "./pages/components/Cluster.page.tsx";
import { CodeBlockPage } from "./pages/components/CodeBlock.page.tsx";
import { ContainerPage } from "./pages/components/Container.page.tsx";
import { DescriptionListPage } from "./pages/components/DescriptionList.page.tsx";
import { DialogPage } from "./pages/components/Dialog.page.tsx";
import { DividerPage } from "./pages/components/Divider.page.tsx";
import { DrawerPage } from "./pages/components/Drawer.page.tsx";
import { DropdownPage } from "./pages/components/Dropdown.page.tsx";
import { DropdownMenuPage } from "./pages/components/DropdownMenu.page.tsx";
import { EmptyStatePage } from "./pages/components/EmptyState.page.tsx";
import { FieldPage } from "./pages/components/Field.page.tsx";
import { FieldsetPage } from "./pages/components/Fieldset.page.tsx";
import { FigurePage } from "./pages/components/Figure.page.tsx";
import { GridPage } from "./pages/components/Grid.page.tsx";
import { IconsPage } from "./pages/components/Icons.page.tsx";
import { ImagePage } from "./pages/components/Image.page.tsx";
import { InsetPage } from "./pages/components/Inset.page.tsx";
import { InlinePage } from "./pages/components/Inline.page.tsx";
import { InputPage } from "./pages/components/Input.page.tsx";
import { KbdPage } from "./pages/components/Kbd.page.tsx";
import { LabelPage } from "./pages/components/Label.page.tsx";
import { LinkBoxPage } from "./pages/components/LinkBox.page.tsx";
import { ListPage } from "./pages/components/List.page.tsx";
import { MetaTablePage } from "./pages/components/MetaTable.page.tsx";
import { ModalPage } from "./pages/components/Modal.page.tsx";
import { NavbarPage } from "./pages/components/Navbar.page.tsx";
import { OffcanvasPage } from "./pages/components/Offcanvas.page.tsx";
import { OnThisPagePage } from "./pages/components/OnThisPage.page.tsx";
import { PaginationPage } from "./pages/components/Pagination.page.tsx";
import { PopoverPage } from "./pages/components/Popover.page.tsx";
import { PopoverTriggerPage } from "./pages/components/PopoverTrigger.page.tsx";
import { ProgressPage } from "./pages/components/Progress.page.tsx";
import { QuickMenuPage } from "./pages/components/QuickMenu.page.tsx";
import { RadioPage } from "./pages/components/Radio.page.tsx";
import { ScreenPage } from "./pages/components/Screen.page.tsx";
import { ScrollAreaPage } from "./pages/components/ScrollArea.page.tsx";
import { SectionPage } from "./pages/components/Section.page.tsx";
import { SelectPage } from "./pages/components/Select.page.tsx";
import { ShowPage } from "./pages/components/Show.page.tsx";
import { SkeletonPage } from "./pages/components/Skeleton.page.tsx";
import { ShortcutPage } from "./pages/components/Shortcut.page.tsx";
import { SnippetPage } from "./pages/components/Snippet.page.tsx";
import { SpacerPage } from "./pages/components/Spacer.page.tsx";
import { SpinnerPage } from "./pages/components/Spinner.page.tsx";
import { SplitPage } from "./pages/components/Split.page.tsx";
import { StackPage } from "./pages/components/Stack.page.tsx";
import { StatPage } from "./pages/components/Stat.page.tsx";
import { StatusDotPage } from "./pages/components/StatusDot.page.tsx";
import { StepsPage } from "./pages/components/Steps.page.tsx";
import { SurfacePage } from "./pages/components/Surface.page.tsx";
import { TabsPage } from "./pages/components/Tabs.page.tsx";
import { TablePage } from "./pages/components/Table.page.tsx";
import { TextPage } from "./pages/components/Text.page.tsx";
import { TextareaPage } from "./pages/components/Textarea.page.tsx";
import { ThemeSwitchPage } from "./pages/components/ThemeSwitch.page.tsx";
import { ToastPage } from "./pages/components/Toast.page.tsx";
import { ToolbarPage } from "./pages/components/Toolbar.page.tsx";
import { TooltipPage } from "./pages/components/Tooltip.page.tsx";
import { TopbarPage } from "./pages/components/Topbar.page.tsx";
import { TitlePage } from "./pages/components/Title.page.tsx";
import { TypecaseRootPage } from "./pages/components/TypecaseRoot.page.tsx";
import { SwitchPage } from "./pages/components/Switch.page.tsx";

const app = defineApp({
    id: "typecase-site",
    navigation: "spa",
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
        localePrefix: "except-default",
    },
    pages: [
        HomePage,
        TypecaseRootPage,
        IconsPage,
        TextPage,
        TitlePage,
        AnchorPage,
        ButtonPage,
        BadgePage,
        StatusDotPage,
        SpinnerPage,
        KbdPage,
        ShortcutPage,
        ProgressPage,
        SkeletonPage,
        ImagePage,
        AvatarPage,
        LabelPage,
        InputPage,
        TextareaPage,
        SelectPage,
        SwitchPage,
        CheckboxPage,
        RadioPage,
        DividerPage,
        ContainerPage,
        SectionPage,
        StackPage,
        InlinePage,
        ClusterPage,
        CenterPage,
        SpacerPage,
        InsetPage,
        GridPage,
        SurfacePage,
        ScreenPage,
        ScrollAreaPage,
        ShowPage,
        SplitPage,
        BreadcrumbPage,
        PaginationPage,
        StepsPage,
        CardPage,
        LinkBoxPage,
        CalloutPage,
        AlertPage,
        ToastPage,
        CodeBlockPage,
        ListPage,
        TabsPage,
        AccordionPage,
        TablePage,
        DescriptionListPage,
        EmptyStatePage,
        StatPage,
        FigurePage,
        FieldPage,
        FieldsetPage,
        MetaTablePage,
        DropdownPage,
        DialogPage,
        NavbarPage,
        TopbarPage,
        ToolbarPage,
        QuickMenuPage,
        OffcanvasPage,
        SnippetPage,
        OnThisPagePage,
        DrawerPage,
        DropdownMenuPage,
        PopoverPage,
        PopoverTriggerPage,
        ModalPage,
        TooltipPage,
        ThemeSwitchPage,
    ],
    notFound: NotFoundPage,
});

startApp(app, {
    mount: "#app",
});
