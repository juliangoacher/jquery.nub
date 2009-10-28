<?xml version="1.0" encoding="iso-8859-1"?>
<!DOCTYPE xsl:transform [
<!ENTITY nbsp "&#x000A0;">
<!ENTITY copy "&#x00A9;">
]>
<xsl:transform xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

<xsl:output method="html" encoding="iso-8859-1" indent="yes"/>

<!-- Identity transform. -->
<xsl:template match="node()|@*">
    <xsl:copy>
        <xsl:apply-templates select="@*"/>
        <xsl:apply-templates/>
    </xsl:copy>
</xsl:template>

<xsl:template match="entity">
    <xsl:choose>
        <xsl:when test="@name='copy'">&copy;</xsl:when>
        <xsl:when test="@name='nbsp'">&nbsp;</xsl:when>
    </xsl:choose>
</xsl:template>

<xsl:template match="site">
    <xsl:apply-templates select="page|section"/>
</xsl:template>

<!-- Generate links to the site icon -->
<xsl:template name="site-icon">
    <xsl:if test="/site/@icon">
        <link rel="icon" type="image/vnd.microsoft.icon" href="{/site/@icon}"/>
        <link rel="SHORTCUT ICON" href="{/site/@icon}"/>
    </xsl:if>
</xsl:template>

<!-- Generate the site menu -->
<xsl:template name="generate-menu">
    <xsl:param name="visible-page-id"/>
    <ul>
        <xsl:apply-templates select="/site/page|/site/section" mode="menu">
            <xsl:with-param name="visible-page-id" select="$visible-page-id"/>
        </xsl:apply-templates>
    </ul>
</xsl:template>

<!-- Generate a page entry in the site menu -->
<xsl:template match="page" mode="menu">
    <xsl:param name="prefix"/>
    <xsl:param name="visible-page-id"/>
    <xsl:variable name="page-id" select="concat($prefix,@id)"/>
    <li class="menu-item">
        <!-- If the menu item is for the visible page then mark the item as selected -->
        <xsl:if test="$visible-page-id = $page-id">
            <xsl:attribute name="class">selected-menu-item</xsl:attribute>
        </xsl:if>
        <a href="{$page-id}.html">
            <xsl:value-of select="@title"/>
        </a>
    </li>
</xsl:template>

<!-- Generate a section entry in the site menu -->
<xsl:template match="section" mode="menu">
    <xsl:param name="prefix"/>
    <xsl:param name="visible-page-id"/>
    <li>
        <xsl:value-of select="@title"/>
        <ul>
            <xsl:apply-templates select="page|section" mode="menu">
                <!-- All sub pages and sections have their ID prefixed with this section ID + '-' -->
                <xsl:with-param name="prefix" select="concat($prefix,@id,'-')"/>
                <xsl:with-param name="visible-page-id" select="$visible-page-id"/>
            </xsl:apply-templates>
        </ul>
    </li>
</xsl:template>

<!-- Generate the site page footer -->
<xsl:template name="generate-footer">
    <xsl:apply-templates select="/site/footer/node()"/>
    <!--
    <xsl:copy-of select="/site/footer/node()"/>
    -->
</xsl:template>

<!-- Generate a single page -->
<xsl:template match="page">
    <!-- The section prefix -->
    <xsl:param name="prefix"/>
    <xsl:variable name="page-id" select="concat($prefix,@id)"/>
    <div id="{$page-id}">
        <xsl:call-template name="generate-menu">
            <xsl:with-param name="visible-page-id" select="$page-id"/>
        </xsl:call-template>
        <xsl:call-template name="page-content"/>
        <xsl:call-template name="generate-footer"/>
    </div>
</xsl:template>

<!-- Insert and page headers into the result -->
<xsl:template name="page-headers">
    <xsl:copy-of select="/site/head/node()"/>
    <xsl:copy-of select="ancestor::section/head/node()"/>
    <xsl:if test="@href">
        <xsl:apply-templates select="document(@href)/html/head/node()"/>
    </xsl:if>
    <xsl:copy-of select="head/node()"/>
</xsl:template>

<!-- Insert the page content into the result -->
<xsl:template name="page-content">
    <xsl:if test="@href">
        <xsl:apply-templates select="document(@href)/html/body/node()"/>
    </xsl:if>
    <xsl:choose>
        <xsl:when test="body">
            <xsl:apply-templates select="body/node()"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:apply-templates select="node()"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<!-- Generate a site section -->
<xsl:template match="section">
    <!-- The section prefix -->
    <xsl:param name="prefix"/>
    <xsl:apply-templates select="page|section">
        <xsl:with-param name="prefix" select="concat(@id,'-')"/>
    </xsl:apply-templates>
</xsl:template>

</xsl:transform>
