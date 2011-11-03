jQuery(document).ready(function() {
  jQuery("input.search_autocomplete").focus(function(){
    var input = jQuery(this);
    input[0].autocompleter.getOptions().footer = "";
    input[0].autocompleter.getExtraParams()["id"] = jQuery("#" + input.attr("id") + "_picker").val();
  });

  jQuery(".ontology_picker_single").live("change", function(){
    var current_side = jQuery(this).attr("id").replace("_picker", "");
    jQuery("#" + current_side)[0].autocompleter.flushCache();
    jQuery("#" + current_side)[0].autocompleter.getOptions().width = 450;

    if (jQuery(this).val() == "") {
      jQuery("#" + current_side + "_bioportal_ontology_id").val("all");
    }
  });

  jQuery("input.search_autocomplete").bind("autocomplete_selected", function(){
    var input = jQuery(this);
    if (input.val() != input.attr("title") && input.val() !== "") {
      getTermDetails(this);
    }
  });

  jQuery("input.search_autocomplete").blur(function(){
    var input = jQuery(this);
    setTimeout(function() {
      if (input.val() == "" || input.val() == input.attr("title")) {
        jQuery("#" + input.attr("id") + "_concept_details").hide();
      }
    }, 1);
  });

  jQuery("input.search_autocomplete").each(function(){
    var input = jQuery(this);
    if (input.val() != input.attr("title") && input.val() != "") {
      getTermDetails(this);
    }
  });

  // Reset mapping UI when tree changes or loaded from ajax
  jQuery(document).bind("tree_changed", resetMappingUIWithFacebox);
  jQuery(document).bind("terms_tab_visible", resetMappingUI);

  // Details/visualze link to show details pane and visualize flexviz
  jQuery.facebox.settings.closeImage = '/javascripts/JqueryPlugins/facebox/closelabel.png';
  jQuery.facebox.settings.loadingImage = '/javascripts/JqueryPlugins/facebox/loading.gif';

  jQuery('a[rel*=facebox]').facebox();

  // Wire up popup for advanced options
  create_mapping_advanced_options.init();

  jQuery("#create_mapping_button").live("click", bp_createMapping.create);
});

function getTermDetails(input) {
  var current_id = jQuery(input).attr("id");
  var current_ont_id = jQuery("#" + current_id + "_bioportal_ontology_id").val();
  var current_concept_id = jQuery("#" + current_id + "_bioportal_full_id").val();
  jQuery("#" + current_id + "_concept_details_table").html('<img style="padding: 5px;" src="/images/spinners/spinner_000000_16px.gif">');
  jQuery("#" + current_id + "_concept_details_table").load("/ajax/term_details/" + current_ont_id + "?styled=false&conceptid=" + current_concept_id);
  jQuery("#" + current_id + "_concept_details").show();
}

function resetMappingUIWithFacebox() {
  jQuery('a[rel*=facebox]').facebox();
  resetMappingUI();
}

function resetMappingUI() {
  // Set the map from side to the new term from the tree
  jQuery("#map_from").val(jQuery.trim(jQuery("#sd_content a.active").text()));
  jQuery("#map_from_bioportal_full_id").val(jQuery("#sd_content a.active").attr("id"));
  getTermDetails(document.getElementById("map_from"));

  // Clear the map to side
  jQuery("#map_to").val(jQuery("#map_to").attr("title")).addClass("help_text_font");
  jQuery("#map_to_concept_details").hide();

  // Clear mapping created messages
  jQuery("#create_mapping_success_messages").html("");

  jQuery("a.link_button, input.link_button").button();
}

var bp_createMapping = {
  create: function() {
    bp_createMapping.reset();
    jQuery("#create_mapping_spinner").show();
    var errored = bp_createMapping.validate();

    if (errored) {
      jQuery("#create_mapping_spinner").hide();
      return false;
    }

    var ontology_from = jQuery("#map_from_bioportal_ontology_id");
    var ontology_to = jQuery("#map_to_bioportal_ontology_id");
    var concept_from_id = jQuery("#map_from_bioportal_full_id");
    var concept_to_id = jQuery("#map_to_bioportal_full_id");
    var mapping_comment = jQuery("#mapping_comment");
    var mapping_directionality = jQuery("#mapping_directionality");

    var params = {
      map_from_bioportal_ontology_id: ontology_from.val(),
      map_to_bioportal_ontology_id: ontology_to.val(),
      map_from_bioportal_full_id: concept_from_id.val(),
      map_to_bioportal_full_id: concept_to_id.val(),
      mapping_comment: mapping_comment.val(),
      mapping_directionality: mapping_directionality.val()
    }

    jQuery.ajax({
        url: "/mappings",
        type: "POST",
        data: params,
        success: bp_createMapping.success,
        error: bp_createMapping.error
    });
  },

  success: function(data) {
    jQuery("#create_mapping_spinner").hide();
    jQuery("#create_mapping_success_messages").prepend(jQuery("<div/>").addClass("success_message").html(
        "Mapping from <b>" + jQuery("#map_from").val() + "</b> to <b>" + jQuery("#map_to").val() + "</b> was created"
    ));

    // If we have a concept mapping table, update it with new mappings
    if (document.getElementById("concept_mappings_table") != null) {
      jQuery("#concept_mappings_table").load("/ajax/mappings/get_concept_table?ontologyid=" + ontology_id + "&conceptid=" + currentConcept, function(){
        jQuery("#mapping_count").html(jQuery("#mapping_details tbody tr:visible").size());
      });
    }

    // Clear the map to side
    jQuery("#map_to").val(jQuery("#map_to").attr("title")).addClass("help_text_font");
    jQuery("#map_to_concept_details").hide();

    jQuery.bioportal.ont_pages["mappings"].retrieve_and_publish();
  },

  error: function() {
    jQuery("#create_mapping_spinner").hide();
    jQuery("#create_mapping_error").html("There was a problem creating the mapping, please try again");
  },

  validate: function() {
    var concept_from_input = jQuery("#map_from");
    var concept_to_input = jQuery("#map_to");
    var error = jQuery("#create_mapping_error");
    var errors = ["<b>Problem creating mapping:</b>"];
    var errored = false;

    if (concept_from_input.val() == "" || concept_from_input.val() == concept_from_input.attr("title")) {
      errors.push("Please select term to map from");
      errored = true;
    }

    if (concept_to_input.val() == "" || concept_to_input.val() == concept_to_input.attr("title")) {
      errors.push("Please select term to map to");
      errored = true;
    }

    if (errors.length > 1)
      jQuery("#create_mapping_error").html(errors.join("<br/>"));

    return errored;
  },

  reset: function() {
    jQuery("#create_mapping_error").html("");
  }
}

// Popup for advanced options
var create_mapping_advanced_options = {
  init: function() {
    jQuery("#create_mapping_advanced").bind("click", function(e){bp_popup_init(e)});
    jQuery("#create_mapping_advanced_options").click(function(e){e.stopPropagation()});
    this.cleanup();
  },

  cleanup: function() {
    jQuery("html").click(bp_popup_cleanup);
    jQuery(document).keyup(function(e) {
      if (e.keyCode == 27) { bp_popup_cleanup(); } // esc
    });
  }

}
